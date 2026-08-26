package com.darkxvenom.airbeats.voice

import android.content.Context
import android.content.Intent
import android.speech.tts.TextToSpeech
import com.darkxvenom.airbeats.R
import com.darkxvenom.airbeats.constants.HideExplicitKey
import com.darkxvenom.airbeats.constants.MusicProviderKey
import com.darkxvenom.airbeats.constants.VoiceAssistantTtsFeedbackKey
import com.darkxvenom.airbeats.innertube.YouTube
import com.darkxvenom.airbeats.innertube.models.SongItem
import com.darkxvenom.airbeats.innertube.models.WatchEndpoint
import com.darkxvenom.airbeats.innertube.models.filterExplicit
import com.darkxvenom.airbeats.models.toMediaMetadata
import com.darkxvenom.airbeats.playback.MusicService
import com.darkxvenom.airbeats.playback.queues.YouTubeQueue
import com.darkxvenom.airbeats.utils.dataStore
import com.darkxvenom.airbeats.utils.get
import com.darkxvenom.airbeats.utils.reportException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.util.Locale

class VoiceAssistantActionExecutor(
    private val context: Context,
    private val scope: CoroutineScope,
    private val getMusicService: () -> MusicService?
) : TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null
    private var isTtsReady = false

    init {
        try {
            tts = TextToSpeech(context.applicationContext, this)
        } catch (e: Exception) {
            Timber.e(e, "Failed to initialize TextToSpeech")
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.getDefault()
            isTtsReady = true
        } else {
            Timber.w("TextToSpeech initialization failed with status $status")
        }
    }

    fun speak(text: String) {
        scope.launch {
            val ttsEnabled = context.dataStore.get(VoiceAssistantTtsFeedbackKey, true)
            if (ttsEnabled && isTtsReady && tts != null) {
                tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "airbeats_voice_feedback")
            }
        }
    }

    fun execute(command: VoiceCommand) {
        Timber.d("Executing voice command: %s", command)

        when (command) {
            is VoiceCommand.PlaySong -> {
                handlePlaySong(command.query)
            }
            is VoiceCommand.Pause -> {
                val service = ensureMusicService()
                service?.player?.pause()
            }
            is VoiceCommand.Resume -> {
                val service = ensureMusicService()
                service?.player?.play()
            }
            is VoiceCommand.NextTrack -> {
                val service = ensureMusicService()
                service?.player?.let { player ->
                    if (player.hasNextMediaItem()) {
                        player.seekToNext()
                        player.prepare()
                        player.playWhenReady = true
                    }
                }
            }
            is VoiceCommand.PreviousTrack -> {
                val service = ensureMusicService()
                service?.player?.let { player ->
                    if (player.hasPreviousMediaItem() || player.currentPosition > 3000) {
                        player.seekToPrevious()
                        player.prepare()
                        player.playWhenReady = true
                    }
                }
            }
            is VoiceCommand.ToggleLike -> {
                val service = ensureMusicService()
                service?.toggleLike()
            }
            is VoiceCommand.StartRadio -> {
                val service = ensureMusicService()
                service?.startRadioSeamlessly()
            }
            is VoiceCommand.VolumeUp -> {
                val service = ensureMusicService()
                service?.player?.let { player ->
                    val newVol = (player.volume + 0.15f).coerceIn(0f, 1f)
                    player.volume = newVol
                }
            }
            is VoiceCommand.VolumeDown -> {
                val service = ensureMusicService()
                service?.player?.let { player ->
                    val newVol = (player.volume - 0.15f).coerceIn(0f, 1f)
                    player.volume = newVol
                }
            }
            is VoiceCommand.SetVolume -> {
                val service = ensureMusicService()
                service?.player?.let { player ->
                    val newVol = (command.levelPercent / 100f).coerceIn(0f, 1f)
                    player.volume = newVol
                }
            }
            is VoiceCommand.Mute -> {
                val service = ensureMusicService()
                service?.player?.volume = 0f
            }
            is VoiceCommand.Unmute -> {
                val service = ensureMusicService()
                service?.player?.volume = 1f
            }
            is VoiceCommand.Unknown -> {
                Timber.d("Unknown voice command: %s", command.rawText)
            }
        }
    }

    private fun handlePlaySong(query: String) {
        scope.launch {
            try {
                val service = ensureMusicService()
                val hideExplicit = context.dataStore.get(HideExplicitKey, false)
                val musicProvider = context.dataStore.get(MusicProviderKey, "YT")

                var songToPlay: SongItem? = null

                if (musicProvider == "JIOSAAVN") {
                    val jioResult = com.darkxvenom.airbeats.jiosaavn.JioSaavnApi.searchSongs(query)
                    songToPlay = jioResult.getOrNull()?.firstOrNull()
                }

                if (songToPlay == null) {
                    val searchResult = withContext(Dispatchers.IO) {
                        YouTube.search(query, YouTube.SearchFilter.FILTER_SONG)
                    }

                    songToPlay = searchResult.getOrNull()?.items
                        ?.filterIsInstance<SongItem>()
                        ?.filterExplicit(hideExplicit)
                        ?.firstOrNull()

                    // Fallback to searchSummary if FILTER_SONG had no direct matches
                    if (songToPlay == null) {
                        val summaryResult = withContext(Dispatchers.IO) {
                            YouTube.searchSummary(query)
                        }
                        songToPlay = summaryResult.getOrNull()?.summaries
                            ?.flatMap { it.items }
                            ?.filterIsInstance<SongItem>()
                            ?.filterExplicit(hideExplicit)
                            ?.firstOrNull()
                    }
                }

                if (songToPlay != null) {
                    val metadata = songToPlay.toMediaMetadata()
                    val queue = YouTubeQueue(WatchEndpoint(songToPlay.id), metadata)

                    if (service != null) {
                        service.playQueue(queue, playWhenReady = true)
                    } else {
                        // If service is null, launch MusicService explicitly with action
                        val intent = Intent(context, MusicService::class.java)
                        context.startService(intent)
                    }

                    val artistName = songToPlay.artists.joinToString { it.name }
                    if (artistName.isNotBlank()) {
                        speak(context.getString(R.string.voice_playing_feedback, songToPlay.title, artistName))
                    } else {
                        speak(context.getString(R.string.voice_playing_simple, songToPlay.title))
                    }
                } else {
                    speak(context.getString(R.string.voice_song_not_found))
                }
            } catch (e: Exception) {
                Timber.e(e, "Error searching and playing song for query '%s'", query)
                reportException(e)
                speak(context.getString(R.string.voice_song_not_found))
            }
        }
    }

    private fun ensureMusicService(): MusicService? {
        val service = getMusicService()
        if (service == null) {
            try {
                val intent = Intent(context, MusicService::class.java)
                context.startService(intent)
            } catch (e: Exception) {
                Timber.e(e, "Failed to start MusicService")
            }
        }
        return service
    }

    fun release() {
        try {
            tts?.stop()
            tts?.shutdown()
            tts = null
            isTtsReady = false
        } catch (e: Exception) {
            Timber.e(e, "Error releasing TextToSpeech")
        }
    }
}
