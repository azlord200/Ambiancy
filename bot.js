// Importe les classes nécessaires de la bibliothèque discord.js
const { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    EmbedBuilder,
    PermissionFlagsBits // ✅ pour les permissions CONNECT/SPEAK
} = require('discord.js');
// Importe les fonctions pour la gestion des connexions vocales et de la lecture audio
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
// Importe le module 'fs' (File System) de Node.js pour lire les fichiers locaux
const fs = require('node:fs');
// Importe le module 'path' de Node.js pour gérer les chemins de fichiers
const path = require('node:path');
// Importe les classes nécessaires pour construire les slash commands et interagir avec l'API Discord
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

// --- CONFIGURATION DU BOT ---
// ⚠️ Remets ton token ici ou utilise une variable d'environnement
const TOKEN = process.env.BOT_TOKEN || 'VOTRE_TOKEN_BOT_ICI';

// Remplacez 'VOTRE_ID_UTILISATEUR_DISCORD' par l'ID Discord de l'utilisateur autorisé à contrôler le bot
const AUTHORIZED_USER_ID = '';
// CHEMIN VERS LE FICHIER AUDIO LOCAL
const LOCAL_AUDIO_FILE_NAME = 'loop_audio.mp3';
const AUDIO_DIRECTORY = 'audio'; // Le dossier 'audio' doit être à la racine de votre bot
const LOCAL_AUDIO_FILE_PATH = path.join(__dirname, AUDIO_DIRECTORY, LOCAL_AUDIO_FILE_NAME);

// ID du canal vocal que le bot doit rejoindre automatiquement au démarrage.
const AUTO_JOIN_VOICE_CHANNEL_ID = ''; // <-- ID mis à jour

// --- COULEURS ET ÉMOJIS POUR LES LOGS CONSOLE ---
const COLORS = {
    RESET: '\x1b[0m',
    BRIGHT: '\x1b[1m',
    DIM: '\x1b[2m',
    UNDERSCORE: '\x1b[4m',
    BLINK: '\x1b[5m',
    REVERSE: '\x1b[7m',
    HIDDEN: '\x1b[8m',

    BLACK: '\x1b[30m',
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m',
    WHITE: '\x1b[37m',

    BGBLACK: '\x1b[40m',
    BGRED: '\x1b[41m',
    BGGREEN: '\x1b[42m',
    BGYELLOW: '\x1b[43m',
    BGBLUE: '\x1b[44m',
    BGMAGENTA: '\x1b[45m',
    BGCYAN: '\x1b[46m',
    BGWHITE: '\x1b[47m'
};

const EMOJIS = {
    SUCCESS: '✅',
    INFO: 'ℹ️',
    WARNING: '⚠️',
    ERROR: '❌',
    BOT: '🤖',
    VOICE: '🔊',
    RESTART: '🔄',
    COMMAND: '✨',
    PING: '🏓' 
};

// Fonction utilitaire pour obtenir l'heure actuelle formatée
function getTimestamp() {
    const now = new Date();
    return `[${now.toLocaleTimeString('fr-FR')}]`;
}

// Crée une nouvelle instance du client Discord avec les intentions nécessaires
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           // Nécessaire pour les informations sur les serveurs (guildes)
        GatewayIntentBits.GuildVoiceStates, // Nécessaire pour la gestion des états vocaux (connexion aux canaux vocaux)
    ]
});

// Variables pour stocker la connexion vocale et le lecteur audio
let connection; // Représente la connexion du bot à un canal vocal
let player;     // Gère la lecture de l'audio

// Collection pour stocker les commandes (utile pour les bots plus complexes)
client.commands = new Collection();

// Définition des slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('join')
        .setDescription('Le bot rejoint votre canal vocal et commence à diffuser le son.'),
    new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Le bot quitte le canal vocal.'),
    new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Arrête le bot (nécessite un redémarrage manuel).'),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche la liste des commandes disponibles.'),
    // --- NOUVELLE COMMANDE : PING ---
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Vérifie le temps de réponse du bot.'),
].map(command => command.toJSON()); // Convertit les commandes en format JSON

// --- ÉVÉNEMENT : BOT PRÊT ---
client.once('ready', async () => {
    console.log(`${getTimestamp()} ${COLORS.GREEN}${EMOJIS.SUCCESS} : ${COLORS.BRIGHT}Connecté en tant que ${client.user.tag}!${COLORS.RESET}`);
    console.log(`${getTimestamp()} ${COLORS.CYAN}${EMOJIS.BOT} : ${COLORS.DIM}Le bot est prêt à recevoir des commandes.${COLORS.RESET}`);

    // Déploiement des slash commands
    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log(`${getTimestamp()} ${COLORS.YELLOW}${EMOJIS.COMMAND} : Début du rafraîchissement des (/) commandes de l'application.${COLORS.RESET}`);

        await rest.put(
            Routes.applicationCommands(client.user.id), // Déploie globalement
            { body: commands },
        );

        console.log(`${getTimestamp()} ${COLORS.GREEN}${EMOJIS.SUCCESS} : Les (/) commandes de l'application ont été rafraîchies avec succès.${COLORS.RESET}`);
    } catch (error) {
        console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Erreur lors du rafraîchissement des (/) commandes :`, error, COLORS.RESET);
    }

    // --- JOINDRE LE SALON VOCAL AUTOMATIQUEMENT AU DÉMARRAGE ---
    if (AUTO_JOIN_VOICE_CHANNEL_ID) {
        try {
            const targetChannel = await client.channels.fetch(AUTO_JOIN_VOICE_CHANNEL_ID);

            if (!targetChannel || !targetChannel.isVoiceBased()) {
                console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Le canal avec l'ID ${AUTO_JOIN_VOICE_CHANNEL_ID} n'est pas un canal vocal valide ou n'a pas été trouvé.${COLORS.RESET}`);
                return;
            }

            // ✅ Vérifie si le bot a les permissions de se connecter et de parler
            const permissions = targetChannel.permissionsFor(client.user);

            if (
                !permissions ||
                !permissions.has(PermissionFlagsBits.Connect) ||
                !permissions.has(PermissionFlagsBits.Speak)
            ) {
                console.error(
                    `${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : ` +
                    `Le bot n'a pas les permissions nécessaires (CONNECT et SPEAK) dans le canal vocal ${targetChannel.name}.${COLORS.RESET}`
                );
                return;
            }

            connection = joinVoiceChannel({
                channelId: targetChannel.id,
                guildId: targetChannel.guild.id,
                adapterCreator: targetChannel.guild.voiceAdapterCreator,
            });
            console.log(`${getTimestamp()} ${COLORS.BLUE}${EMOJIS.VOICE} : Le bot a rejoint automatiquement le canal vocal : ${targetChannel.name}${COLORS.RESET}`);

            if (!player) {
                player = createAudioPlayer();
                connection.subscribe(player);
            }
            playAudioLoop();

        } catch (error) {
            console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Erreur lors de la tentative de rejoindre automatiquement le canal vocal :`, error, COLORS.RESET);
        }
    } else {
        console.log(`${getTimestamp()} ${COLORS.YELLOW}${EMOJIS.INFO} : L'ID du canal vocal pour le joint automatique n'est pas configuré. Le bot attendra la commande /join.${COLORS.RESET}`);
    }
});

// --- ÉVÉNEMENT : INTERACTION CRÉÉE ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.user.id !== AUTHORIZED_USER_ID) {
        return interaction.reply({ content: "Désolé, vous n'êtes pas autorisé à utiliser ce bot.", ephemeral: true });
    }

    const { commandName } = interaction;

    switch (commandName) {
        case 'join':
            if (!interaction.member.voice.channel) {
                return interaction.reply({ content: 'Vous devez être dans un canal vocal pour que je puisse vous rejoindre !', ephemeral: true });
            }

            try {
                // (Optionnel) Vérifier aussi les permissions dans le canal de l’utilisateur
                const voicePermissions = interaction.member.voice.channel.permissionsFor(interaction.guild.members.me);

                if (
                    !voicePermissions ||
                    !voicePermissions.has(PermissionFlagsBits.Connect) ||
                    !voicePermissions.has(PermissionFlagsBits.Speak)
                ) {
                    return interaction.reply({
                        content: "Je n'ai pas les permissions nécessaires (CONNECT et SPEAK) dans ton canal vocal.",
                        ephemeral: true
                    });
                }

                connection = joinVoiceChannel({
                    channelId: interaction.member.voice.channel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });
                await interaction.reply({ content: `J'ai rejoint le canal vocal : **${interaction.member.voice.channel.name}**`, ephemeral: true });

                if (!player) {
                    player = createAudioPlayer();
                    connection.subscribe(player);
                }
                playAudioLoop();

            } catch (error) {
                console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Erreur lors de la connexion au canal vocal :`, error, COLORS.RESET);
                await interaction.reply({ content: 'Une erreur est survenue lors de la tentative de connexion au canal vocal.', ephemeral: true });
            }
            break;

        case 'leave':
            if (connection) {
                connection.destroy();
                connection = null;
                player = null;
                await interaction.reply({ content: 'J\'ai quitté le canal vocal.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Je ne suis pas actuellement dans un canal vocal.', ephemeral: true });
            }
            break;

        case 'restart':
            await interaction.reply({ content: 'Redémarrage du bot en cours... (Cela va arrêter le processus du bot. Vous devrez le relancer manuellement.)', ephemeral: true });
            process.exit(0);
            break;

        case 'help':
            const helpEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${EMOJIS.COMMAND} Commandes du Bot`)
                .setDescription('Voici la liste des commandes disponibles (uniquement pour l\'utilisateur autorisé) :')
                .addFields(
                    { name: '/join', value: '`/join` : Le bot rejoint votre canal vocal et commence à diffuser le son.' },
                    { name: '/leave', value: '`/leave` : Le bot quitte le canal vocal.' },
                    { name: '/restart', value: '`/restart` : Le bot redémarre (nécessite un relancement manuel).' },
                    { name: '/help', value: '`/help` : Affiche cette aide (celle que vous voyez actuellement).' },
                    { name: '/ping', value: '`/ping` : Vérifie le temps de réponse du bot.' }
                )
                .setFooter({ text: 'Bot par Pterodactyl' })
                .setTimestamp();

            await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
            break;

        case 'ping':
            const latency = client.ws.ping;
            const apiLatency = Date.now() - interaction.createdTimestamp;

            const pingEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`${EMOJIS.PING} Pong!`)
                .setDescription(`Latence du bot : \`${latency}ms\`\nLatence de l'API : \`${apiLatency}ms\``)
                .setFooter({ text: 'Mesure de latence du bot.' })
                .setTimestamp();

            await interaction.reply({ embeds: [pingEmbed], ephemeral: true });
            break;
    }
});

// --- FONCTION : DIFFUSION AUDIO EN BOUCLE ---
async function playAudioLoop() {
    if (!player) return;

    try {
        console.log(`${getTimestamp()} ${COLORS.CYAN}${EMOJIS.VOICE} : Attempting to read audio file from: ${LOCAL_AUDIO_FILE_PATH}${COLORS.RESET}`);

        const stream = fs.createReadStream(LOCAL_AUDIO_FILE_PATH);
        const resource = createAudioResource(stream);

        player.play(resource);

        player.once(AudioPlayerStatus.Idle, () => {
            console.log(`${getTimestamp()} ${COLORS.YELLOW}${EMOJIS.RESTART} : Lecture audio terminée, redémarrage...${COLORS.RESET}`);
            playAudioLoop();
        });

        player.on('error', error => {
            console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Erreur du lecteur audio :`, error, COLORS.RESET);
            if (connection) {
                console.log(`${getTimestamp()} ${COLORS.YELLOW}${EMOJIS.RESTART} : Tentative de redémarrage de la lecture après erreur...${COLORS.RESET}`);
                playAudioLoop();
            }
        });

    } catch (error) {
        console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Erreur lors de la création du stream ou de la ressource audio :`, error, COLORS.RESET);
        if (error.code === 'ENOENT') {
            console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Le fichier audio n'a pas été trouvé à l'emplacement : ${LOCAL_AUDIO_FILE_PATH}. Veuillez vérifier le chemin et le nom du fichier.${COLORS.RESET}`);
        }
        if (connection) {
            console.log(`${getTimestamp()} ${COLORS.YELLOW}${EMOJIS.RESTART} : Tentative de redémarrage de la lecture après erreur de stream...${COLORS.RESET}`);
            setTimeout(playAudioLoop, 5000);
        }
    }
}

// Connecte le bot à Discord en utilisant le token fourni
client.login(TOKEN);
