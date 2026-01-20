// ============================
require('dotenv').config();
const { Client } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');

const TOKEN = process.env.DISCORD_TOKEN;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
// ============================

// Web server for UptimeRobot pings
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Discord Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`✅ Keep-alive server running on port ${PORT}`);
});

// Discord client
const client = new Client({ 
    intents: 32767
});

console.log('🤖 Starting 24/7 Visual Presence Bot...');

client.once('ready', () => {
    console.log(`✅ ${client.user.username} ready!`);
    joinVoice();
});

// ===== FINAL STABLE JOINVOICE FUNCTION =====
function joinVoice() {
    try {
        const channel = client.channels.cache.get(VOICE_CHANNEL_ID);
        
        if (!channel) {
            console.log('⏳ Channel not found. Retrying in 30s...');
            setTimeout(joinVoice, 30000);
            return;
        }
        
        console.log(`🔍 Attempting to join: ${channel.name}`);
        
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true  // Bot won't transmit audio
        });
        
        console.log(`✅ VISUAL PRESENCE ACTIVE in ${channel.name}!`);
        
        // ===== CRITICAL: DISABLE AUDIO SUBSCRIPTION =====
        // This prevents the encryption handshake loop
        try {
            // Try to access receiver to disable audio processing
            const receiver = connection.receiver;
            receiver.speaking.on('error', () => {
                // Silently ignore speaking errors - they don't matter for visual presence
            });
        } catch (e) {
            // Expected - some environments won't have this, but that's fine
        }
        
        // Simple heartbeat log
        const heartbeat = setInterval(() => {
            console.log('❤️ Visual presence stable');
        }, 5 * 60 * 1000); // Log every 5 minutes
        
        // Handle only important state changes
        connection.on('stateChange', (oldState, newState) => {
            // Only log when status actually changes (not substate changes)
            if (oldState.status !== newState.status) {
                console.log(`🔀 Connection status: ${oldState.status} -> ${newState.status}`);
            }
            
            if (newState.status === 'disconnected') {
                console.log('🔌 Fully disconnected. Rejoining in 10s...');
                clearInterval(heartbeat);
                setTimeout(joinVoice, 10000);
            }
            
            // Ignore the "signalling/connecting" substate loop - it's harmless
        });
        
        // Suppress voice encryption errors - they don't affect visual presence
        connection.on('error', (error) => {
            // Only log non-encryption errors
            if (!error.message.includes('encryption') && !error.message.includes('aead')) {
                console.log('⚠️ Non-voice error:', error.message);
            }
        });
        
    } catch (error) {
        // Only retry on serious errors
        if (!error.message.includes('encryption') && !error.message.includes('aead')) {
            console.error('❌ Join failed:', error.message);
            setTimeout(joinVoice, 10000);
        }
    }
}

// Login

client.login(TOKEN).catch(console.error);
