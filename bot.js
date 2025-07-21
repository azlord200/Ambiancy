// Importe les classes nécessaires de la bibliothèque discord.js
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js'); // Ajout de EmbedBuilder
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
// Remplacez 'VOTRE_TOKEN_BOT_ICI' par le token de votre bot Discord
const TOKEN = '';
// Remplacez 'VOTRE_ID_UTILISATEUR_DISCORD' par l'ID Discord de l'utilisateur autorisé à contrôler le bot
const AUTHORIZED_USER_ID = '';
// CHEMIN VERS LE FICHIER AUDIO LOCAL
// Assurez-vous d'avoir téléchargé le fichier audio (ex: loop_audio.mp3)
// et de l'avoir placé dans un dossier 'audio' à la racine de votre bot sur Pterodactyl.
// Utilisation de path.join pour construire le chemin de manière robuste avec __dirname
const LOCAL_AUDIO_FILE_NAME = 'loop_audio.mp3';
const AUDIO_DIRECTORY = 'audio'; // Le dossier 'audio' doit être à la racine de votre bot
const LOCAL_AUDIO_FILE_PATH = path.join(__dirname, AUDIO_DIRECTORY, LOCAL_AUDIO_FILE_NAME);

// ID du canal vocal que le bot doit rejoindre automatiquement au démarrage.
// REMPLACEZ 'VOTRE_ID_SALON_VOCAL_ICI' par l'ID réel du salon vocal.
// Pour trouver l'ID d'un salon vocal, activez le mode développeur dans Discord
// (Paramètres utilisateur > Avancé > Mode développeur), puis faites un clic droit sur le salon et "Copier l'ID".
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
        GatewayIntentBits.Guilds,           // Nécessaire pour les informations sur les serveurs (guildes)
        GatewayIntentBits.GuildVoiceStates, // Nécessaire pour la gestion des états vocaux (connexion aux canaux vocaux)
    ]
});

// Variables pour stocker la connexion vocale et le lecteur audio
let connection; // Représente la connexion du bot à un canal vocal
let player;     // Gère la lecture de l'audio

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
// Se déclenche une seule fois lorsque le bot est connecté et prêt
client.once('ready', async () => {
    console.log(`${getTimestamp()} ${COLORS.GREEN}${EMOJIS.SUCCESS} : ${COLORS.BRIGHT}Connecté en tant que ${client.user.tag}!${COLORS.RESET}`);
    console.log(`${getTimestamp()} ${COLORS.CYAN}${EMOJIS.BOT} : ${COLORS.DIM}Le bot est prêt à recevoir des commandes.${COLORS.RESET}`);

    // Déploiement des slash commands
    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log(`${getTimestamp()} ${COLORS.YELLOW}${EMOJIS.COMMAND} : Début du rafraîchissement des (/) commandes de l'application.${COLORS.RESET}`);

        // Utilisez Routes.applicationCommands(clientId) pour des commandes globales
        // ou Routes.applicationGuildCommands(clientId, guildId) pour des commandes spécifiques à une guilde (plus rapide pour le développement)
        await rest.put(
            Routes.applicationCommands(client.user.id), // Déploie globalement
            { body: commands },
        );

        console.log(`${getTimestamp()} ${COLORS.GREEN}${EMOJIS.SUCCESS} : Les (/) commandes de l'application ont été rafraîchies avec succès.${COLORS.RESET}`);
    } catch (error) {
        console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Erreur lors du rafraîchissement des (/) commandes :`, error, COLORS.RESET);
    }

    // --- JOINDRE LE SALON VOCAL AUTOMATIQUEMENT AU DÉMARRAGE ---
    if (AUTO_JOIN_VOICE_CHANNEL_ID) { // La vérification de l'ID non-placeholder est maintenant implicite
        try {
            const targetChannel = await client.channels.fetch(AUTO_JOIN_VOICE_CHANNEL_ID);

            if (!targetChannel || !targetChannel.isVoiceBased()) {
                console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Le canal avec l'ID ${AUTO_JOIN_VOICE_CHANNEL_ID} n'est pas un canal vocal valide ou n'a pas été trouvé.${COLORS.RESET}`);
                return;
            }

            // Vérifie si le bot a les permissions de se connecter et de parler
            const permissions = targetChannel.permissionsFor(client.user);
            if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
                console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Le bot n'a pas les permissions nécessaires (CONNECT et SPEAK) dans le canal vocal ${targetChannel.name}.${COLORS.RESET}`);
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
            // Si l'erreur est liée à des permissions manquantes ou à un canal introuvable,
            // le bot ne pourra pas rejoindre et la diffusion ne commencera pas.
        }
    } else {
        console.log(`${getTimestamp()} ${COLORS.YELLOW}${EMOJIS.INFO} : L'ID du canal vocal pour le joint automatique n'est pas configuré. Le bot attendra la commande /join.${COLORS.RESET}`);
    }
});

// --- ÉVÉNEMENT : INTERACTION CRÉÉE ---
// Se déclenche à chaque fois qu'une interaction (comme une slash command) est créée
client.on('interactionCreate', async interaction => {
    // Ignore les interactions qui ne sont pas des commandes de chat
    if (!interaction.isChatInputCommand()) return;

    // Vérifie si l'auteur de l'interaction est l'utilisateur autorisé
    if (interaction.user.id !== AUTHORIZED_USER_ID) {
        return interaction.reply({ content: "Désolé, vous n'êtes pas autorisé à utiliser ce bot.", ephemeral: true }); // Réponse éphémère
    }

    // Récupère le nom de la commande
    const { commandName } = interaction;

    // Gère les différentes commandes
    switch (commandName) {
        case 'join':
            // Vérifie si l'utilisateur qui a envoyé la commande est dans un canal vocal
            if (!interaction.member.voice.channel) {
                return interaction.reply({ content: 'Vous devez être dans un canal vocal pour que je puisse vous rejoindre !', ephemeral: true }); // Réponse éphémère
            }
            try {
                // Tente de rejoindre le canal vocal de l'utilisateur
                connection = joinVoiceChannel({
                    channelId: interaction.member.voice.channel.id, // L'ID du canal vocal de l'utilisateur
                    guildId: interaction.guild.id,                 // L'ID du serveur (guilde)
                    adapterCreator: interaction.guild.voiceAdapterCreator, // L'adaptateur pour la gestion vocale
                });
                await interaction.reply({ content: `J'ai rejoint le canal vocal : **${interaction.member.voice.channel.name}**`, ephemeral: true }); // Réponse éphémère

                // Initialise le lecteur audio si ce n'est pas déjà fait
                if (!player) {
                    player = createAudioPlayer();
                    // Abonne le lecteur audio à la connexion vocale pour diffuser le son
                    connection.subscribe(player);
                }
                // Commence la lecture audio en boucle
                playAudioLoop();

            } catch (error) {
                console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Erreur lors de la connexion au canal vocal :`, error, COLORS.RESET);
                await interaction.reply({ content: 'Une erreur est survenue lors de la tentative de connexion au canal vocal.', ephemeral: true }); // Réponse éphémère
            }
            break;

        case 'leave':
            // Vérifie si le bot est actuellement connecté à un canal vocal
            if (connection) {
                connection.destroy(); // Détruit la connexion vocale
                connection = null;    // Réinitialise la variable de connexion
                player = null;        // Réinitialise le lecteur audio
                await interaction.reply({ content: 'J\'ai quitté le canal vocal.', ephemeral: true }); // Réponse éphémère
            } else {
                await interaction.reply({ content: 'Je ne suis pas actuellement dans un canal vocal.', ephemeral: true }); // Réponse éphémère
            }
            break;

        case 'restart':
            await interaction.reply({ content: 'Redémarrage du bot en cours... (Cela va arrêter le processus du bot. Vous devrez le relancer manuellement.)', ephemeral: true }); // Réponse éphémère
            // Arrête le processus Node.js. Pour un vrai redémarrage automatique, utilisez un outil comme PM2.
            process.exit(0);
            break;

        case 'help':
            // --- COMMANDE HELP (MISE À JOUR AVEC EMBED ET COMMANDES CLIQUABLES) ---
            const helpEmbed = new EmbedBuilder()
                .setColor('#0099ff') // Couleur de l'embed (bleu)
                .setTitle(`${EMOJIS.COMMAND} Commandes du Bot`)
                .setDescription('Voici la liste des commandes disponibles (uniquement pour l\'utilisateur autorisé) :')
                .addFields(
                    // Pour rendre une commande cliquable, utilisez la syntaxe Discord : `</nom_de_la_commande:ID_DE_LA_COMMANDE>`
                    // L'ID de la commande est obtenu APRÈS le déploiement. Pour l'instant, on utilise une mention générique.
                    // Discord convertira automatiquement `</commande:ID>` en lien cliquable si la commande est bien déployée.
                    // Si l'ID n'est pas fourni, le texte est affiché mais n'est pas cliquable.
                    // Pour obtenir les ID, vous pouvez exécuter `/help` une fois et regarder le message brut de l'embed
                    // ou les obtenir via l'API. Pour la démonstration, on utilise des placeholders.
                    { name: '/join', value: '`/join` : Le bot rejoint votre canal vocal et commence à diffuser le son.' },
                    { name: '/leave', value: '`/leave` : Le bot quitte le canal vocal.' },
                    { name: '/restart', value: '`/restart` : Le bot redémarre (nécessite un relancement manuel).' },
                    { name: '/help', value: '`/help` : Affiche cette aide (celle que vous voyez actuellement).' },
                    { name: '/ping', value: '`/ping` : Vérifie le temps de réponse du bot.' }
                )
                .setFooter({ text: 'Bot par Pterodactyl' })
                .setTimestamp();

            await interaction.reply({ embeds: [helpEmbed], ephemeral: true }); // Utilisation de l'embed
            break;

        // --- NOUVELLE COMMANDE : PING ---
        case 'ping':
            const latency = client.ws.ping; // Latence du websocket de Discord
            const apiLatency = Date.now() - interaction.createdTimestamp; // Latence de l'API (temps entre la commande et la réception)

            const pingEmbed = new EmbedBuilder()
                .setColor('#00ff00') // Couleur de l'embed (vert)
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
    // Si le lecteur n'existe pas (par exemple, si le bot n'est pas connecté), ne rien faire
    if (!player) return;

    try {
        // Affiche le chemin complet que le bot essaie d'ouvrir
        console.log(`${getTimestamp()} ${COLORS.INFO}${EMOJIS.VOICE} : Attempting to read audio file from: ${LOCAL_AUDIO_FILE_PATH}${COLORS.RESET}`);
        // Crée un flux de lecture à partir du fichier audio local
        const stream = fs.createReadStream(LOCAL_AUDIO_FILE_PATH);

        // Crée une ressource audio à partir du flux
        const resource = createAudioResource(stream);

        // Joue la ressource audio avec le lecteur
        player.play(resource);

        // Écoute l'événement 'idle' (quand la lecture est terminée) pour redémarrer la boucle
        player.once(AudioPlayerStatus.Idle, () => {
            console.log(`${getTimestamp()} ${COLORS.YELLOW}${EMOJIS.RESTART} : Lecture audio terminée, redémarrage...${COLORS.RESET}`);
            playAudioLoop(); // Rappelle la fonction pour rejouer le son
        });

        // Gère les erreurs du lecteur audio
        player.on('error', error => {
            console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Erreur du lecteur audio :`, error, COLORS.RESET);
            // Tente de redémarrer la lecture en cas d'erreur si une connexion existe
            if (connection) {
                console.log(`${getTimestamp()} ${COLORS.YELLOW}${EMOJIS.RESTART} : Tentative de redémarrage de la lecture après erreur...${COLORS.RESET}`);
                playAudioLoop();
            }
        });

    } catch (error) {
        console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Erreur lors de la création du stream ou de la ressource audio :`, error, COLORS.RESET);
        // Si le fichier n'est pas trouvé, informe l'utilisateur
        if (error.code === 'ENOENT') {
            console.error(`${getTimestamp()} ${COLORS.RED}${EMOJIS.ERROR} : Le fichier audio n'a pas été trouvé à l'emplacement : ${LOCAL_AUDIO_FILE_PATH}. Veuillez vérifier le chemin et le nom du fichier.${COLORS.RESET}`);
        }
        if (connection) {
            console.log(`${getTimestamp()} ${COLORS.YELLOW}${EMOJIS.RESTART} : Tentative de redémarrage de la lecture après erreur de stream...${COLORS.RESET}`);
            // Attend un court instant avant de réessayer pour éviter de spammer en cas d'erreur persistante
            setTimeout(playAudioLoop, 5000); // Attend 5 secondes
        }
    }
}

// Connecte le bot à Discord en utilisant le token fourni
client.login(TOKEN);