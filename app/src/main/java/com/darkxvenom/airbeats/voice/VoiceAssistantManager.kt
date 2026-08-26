package com.darkxvenom.airbeats.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber

class VoiceAssistantManager(
    private val context: Context,
    private val onCommandRecognized: (VoiceCommand, String) -> Unit
) : RecognitionListener {

    private val mainHandler = Handler(Looper.getMainLooper())
    private var speechRecognizer: SpeechRecognizer? = null
    private var isRunning = false
    private var requireWakeWord = true
    private var isCurrentlyRecognizing = false

    private val _isListening = MutableStateFlow(false)
    val isListening: StateFlow<Boolean> = _isListening.asStateFlow()

    private val _lastRecognizedText = MutableStateFlow<String?>(null)
    val lastRecognizedText: StateFlow<String?> = _lastRecognizedText.asStateFlow()

    private val _audioRms = MutableStateFlow(0f)
    val audioRms: StateFlow<Float> = _audioRms.asStateFlow()

    companion object {
        private const val RESTART_DELAY_MS = 400L
        private const val ERROR_RETRY_DELAY_MS = 1000L
    }

    private val restartRunnable = Runnable {
        if (isRunning) {
            startRecognitionInternal()
        }
    }

    fun start(requireWakeWord: Boolean = true) {
        this.requireWakeWord = requireWakeWord
        if (isRunning) return
        isRunning = true

        mainHandler.post {
            ensureRecognizer()
            startRecognitionInternal()
        }
    }

    fun stop() {
        isRunning = false
        mainHandler.removeCallbacks(restartRunnable)
        mainHandler.post {
            try {
                speechRecognizer?.stopListening()
                speechRecognizer?.cancel()
            } catch (e: Exception) {
                Timber.e(e, "Error stopping SpeechRecognizer")
            }
            _isListening.value = false
            isCurrentlyRecognizing = false
        }
    }

    fun updateSettings(requireWakeWord: Boolean) {
        this.requireWakeWord = requireWakeWord
    }

    private fun ensureRecognizer() {
        if (speechRecognizer == null && SpeechRecognizer.isRecognitionAvailable(context)) {
            try {
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context.applicationContext).apply {
                    setRecognitionListener(this@VoiceAssistantManager)
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to create SpeechRecognizer")
            }
        }
    }

    private fun startRecognitionInternal() {
        if (!isRunning) return
        if (speechRecognizer == null) {
            ensureRecognizer()
        }

        val recognizer = speechRecognizer ?: run {
            Timber.w("SpeechRecognizer is not available on this device")
            scheduleRestart(ERROR_RETRY_DELAY_MS)
            return
        }

        try {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
                putExtra("android.speech.extra.DICTATION_MODE", true)
            }

            recognizer.cancel()
            recognizer.startListening(intent)
            _isListening.value = true
            isCurrentlyRecognizing = true
        } catch (e: Exception) {
            Timber.e(e, "Error in startRecognitionInternal")
            _isListening.value = false
            isCurrentlyRecognizing = false
            scheduleRestart(ERROR_RETRY_DELAY_MS)
        }
    }

    private fun scheduleRestart(delayMs: Long = RESTART_DELAY_MS) {
        if (!isRunning) return
        mainHandler.removeCallbacks(restartRunnable)
        mainHandler.postDelayed(restartRunnable, delayMs)
    }

    override fun onReadyForSpeech(params: Bundle?) {
        _isListening.value = true
        isCurrentlyRecognizing = true
    }

    override fun onBeginningOfSpeech() {
        _isListening.value = true
    }

    override fun onRmsChanged(rmsdB: Float) {
        _audioRms.value = rmsdB
    }

    override fun onBufferReceived(buffer: ByteArray?) {}

    override fun onEndOfSpeech() {
        _isListening.value = false
        isCurrentlyRecognizing = false
    }

    override fun onError(error: Int) {
        _isListening.value = false
        isCurrentlyRecognizing = false
        Timber.d("SpeechRecognizer onError: %d", error)

        // For common non-fatal speech timeouts or silence, restart quickly
        val delay = when (error) {
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT,
            SpeechRecognizer.ERROR_NO_MATCH -> RESTART_DELAY_MS
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY,
            SpeechRecognizer.ERROR_CLIENT -> {
                // Recreate recognizer on client or busy error
                try {
                    speechRecognizer?.destroy()
                } catch (_: Exception) {}
                speechRecognizer = null
                ERROR_RETRY_DELAY_MS
            }
            else -> ERROR_RETRY_DELAY_MS
        }

        scheduleRestart(delay)
    }

    override fun onResults(results: Bundle?) {
        _isListening.value = false
        isCurrentlyRecognizing = false

        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val spokenText = matches?.firstOrNull()?.trim()

        if (!spokenText.isNullOrBlank()) {
            Timber.i("Spoken text recognized: '%s'", spokenText)
            _lastRecognizedText.value = spokenText

            val command = VoiceCommandParser.parse(spokenText, requireWakeWord = requireWakeWord)
            if (command !is VoiceCommand.Unknown) {
                onCommandRecognized(command, spokenText)
            }
        }

        scheduleRestart(RESTART_DELAY_MS)
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val partialText = matches?.firstOrNull()?.trim()
        if (!partialText.isNullOrBlank()) {
            _lastRecognizedText.value = partialText
        }
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}

    fun destroy() {
        stop()
        mainHandler.post {
            try {
                speechRecognizer?.destroy()
            } catch (e: Exception) {
                Timber.e(e, "Error destroying SpeechRecognizer")
            }
            speechRecognizer = null
        }
    }
}
