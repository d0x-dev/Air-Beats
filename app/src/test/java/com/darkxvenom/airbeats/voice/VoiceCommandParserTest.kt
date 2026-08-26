package com.darkxvenom.airbeats.voice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class VoiceCommandParserTest {

    @Test
    fun testWakeWordDetection() {
        assertTrue(VoiceCommandParser.containsWakeWord("hi airbeats play song"))
        assertTrue(VoiceCommandParser.containsWakeWord("hey airbeats pause"))
        assertTrue(VoiceCommandParser.containsWakeWord("ok airbeats next"))
        assertTrue(VoiceCommandParser.containsWakeWord("airbeats volume up"))
        assertTrue(VoiceCommandParser.containsWakeWord("aerobeats resume"))
        assertTrue(VoiceCommandParser.containsWakeWord("air beats like"))
    }

    @Test
    fun testPlaySongParsingWithWakeWord() {
        val cmd1 = VoiceCommandParser.parse("Hi AirBeats, play Starboy")
        assertEquals(VoiceCommand.PlaySong("starboy"), cmd1)

        val cmd2 = VoiceCommandParser.parse("Hey AirBeats play Bohemian Rhapsody by Queen")
        assertEquals(VoiceCommand.PlaySong("bohemian rhapsody by queen"), cmd2)

        val cmd3 = VoiceCommandParser.parse("airbeats play song Shape of You")
        assertEquals(VoiceCommand.PlaySong("shape of you"), cmd3)

        val cmd4 = VoiceCommandParser.parse("Air beats, listen to Blinding Lights")
        assertEquals(VoiceCommand.PlaySong("blinding lights"), cmd4)

        val cmd5 = VoiceCommandParser.parse("Ok Airbeats put on Despacito")
        assertEquals(VoiceCommand.PlaySong("despacito"), cmd5)
    }

    @Test
    fun testDirectCommandsMode() {
        val cmd1 = VoiceCommandParser.parse("play Starboy", requireWakeWord = false)
        assertEquals(VoiceCommand.PlaySong("starboy"), cmd1)

        val cmd2 = VoiceCommandParser.parse("pause", requireWakeWord = false)
        assertEquals(VoiceCommand.Pause, cmd2)

        val cmd3 = VoiceCommandParser.parse("next song", requireWakeWord = false)
        assertEquals(VoiceCommand.NextTrack, cmd3)

        val cmd4 = VoiceCommandParser.parse("previous song", requireWakeWord = false)
        assertEquals(VoiceCommand.PreviousTrack, cmd4)

        val cmd5 = VoiceCommandParser.parse("resume", requireWakeWord = false)
        assertEquals(VoiceCommand.Resume, cmd5)
    }

    @Test
    fun testPlaybackControls() {
        assertEquals(VoiceCommand.Pause, VoiceCommandParser.parse("Hi AirBeats pause"))
        assertEquals(VoiceCommand.Pause, VoiceCommandParser.parse("Hey AirBeats, stop music"))
        assertEquals(VoiceCommand.Resume, VoiceCommandParser.parse("AirBeats resume"))
        assertEquals(VoiceCommand.Resume, VoiceCommandParser.parse("AirBeats continue"))
        assertEquals(VoiceCommand.NextTrack, VoiceCommandParser.parse("Hi AirBeats next"))
        assertEquals(VoiceCommand.NextTrack, VoiceCommandParser.parse("Hi AirBeats skip"))
        assertEquals(VoiceCommand.NextTrack, VoiceCommandParser.parse("Hi AirBeats next song"))
        assertEquals(VoiceCommand.PreviousTrack, VoiceCommandParser.parse("Hi AirBeats previous"))
        assertEquals(VoiceCommand.PreviousTrack, VoiceCommandParser.parse("Hi AirBeats back"))
        assertEquals(VoiceCommand.PreviousTrack, VoiceCommandParser.parse("Hi AirBeats previous song"))
    }

    @Test
    fun testLikeAndRadio() {
        assertEquals(VoiceCommand.ToggleLike, VoiceCommandParser.parse("Hi AirBeats like this song"))
        assertEquals(VoiceCommand.ToggleLike, VoiceCommandParser.parse("AirBeats favorite"))
        assertEquals(VoiceCommand.StartRadio, VoiceCommandParser.parse("Hi AirBeats start radio"))
        assertEquals(VoiceCommand.StartRadio, VoiceCommandParser.parse("AirBeats radio"))
    }

    @Test
    fun testVolumeControls() {
        assertEquals(VoiceCommand.VolumeUp, VoiceCommandParser.parse("Hi AirBeats volume up"))
        assertEquals(VoiceCommand.VolumeUp, VoiceCommandParser.parse("AirBeats increase volume"))
        assertEquals(VoiceCommand.VolumeDown, VoiceCommandParser.parse("Hi AirBeats volume down"))
        assertEquals(VoiceCommand.VolumeDown, VoiceCommandParser.parse("AirBeats lower volume"))
        assertEquals(VoiceCommand.SetVolume(80), VoiceCommandParser.parse("Hi AirBeats set volume to 80%"))
        assertEquals(VoiceCommand.SetVolume(50), VoiceCommandParser.parse("AirBeats volume 50"))
        assertEquals(VoiceCommand.Mute, VoiceCommandParser.parse("Hi AirBeats mute"))
        assertEquals(VoiceCommand.Unmute, VoiceCommandParser.parse("Hi AirBeats unmute"))
    }

    @Test
    fun testWakeWordRequiredRejection() {
        val cmd = VoiceCommandParser.parse("play Starboy", requireWakeWord = true)
        assertTrue(cmd is VoiceCommand.Unknown)
    }
}
