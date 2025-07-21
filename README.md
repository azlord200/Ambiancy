# Ambiancy - Votre Bot Discord de Diffusion Audio en Boucle

![Discord.js Version](https://img.shields.io/github/package-json/dependency-version/azlord200/Ambiancy/discord.js)

Ambiancy est un bot Discord simple et léger, conçu pour diffuser un fichier audio en boucle continue dans un salon vocal. Idéal pour créer une ambiance sonore de fond sur votre serveur !

## Fonctionnalités Clés

* **Diffusion Audio en Boucle** : Joue un fichier audio local en continu dans un salon vocal.
* **Rejoint Automatiquement** : Peut être configuré pour rejoindre un salon vocal spécifique dès son démarrage.
* **Commandes Simples** :
    * `/join` : Le bot rejoint votre salon vocal actuel.
    * `/leave` : Le bot quitte le salon vocal.
    * `/restart` : Redémarre le processus du bot (nécessite un relancement manuel ou via PM2/Pterodactyl).
    * `/ping` : Affiche la latence du bot.
    * `/help` : Affiche la liste des commandes disponibles.
* **Accès Restreint** : Seul un utilisateur Discord prédéfini est autorisé à utiliser les commandes du bot, garantissant un contrôle exclusif.
* **Messages d'Erreur Détaillés** : Fournit des retours en console et sur Discord en cas de problème (fichier audio introuvable, permissions manquantes, etc.).

## Prérequis

Avant de lancer le bot, assurez-vous d'avoir :

* [Node.js](https://nodejs.org/) (version 16.x ou supérieure recommandée)
* Un compte Discord et un serveur Discord où vous avez les permissions de gérer les bots.
* Un fichier audio (par exemple, `loop_audio.mp3`) que le bot diffusera.

## Installation et Configuration

1.  **Clonez le dépôt** :
    ```bash
    git clone https://github.com/azlord200/Ambiancy.git
    cd Ambiancy
    ```

2.  **Installez les dépendances** :
    ```bash
    npm install
    ```

3.  **Créez un dossier `audio`** :
    À la racine de votre projet (là où se trouve `bot.js`), créez un dossier nommé `audio`.

4.  **Placez votre fichier audio** :
    Mettez votre fichier audio (par exemple, `loop_audio.mp3`) dans le dossier `audio` que vous venez de créer.

5.  **Configurez `bot.js`** :
    Ouvrez le fichier `bot.js` et modifiez les constantes suivantes en haut du fichier:

    ```javascript
    const TOKEN = 'VOTRE_TOKEN_BOT_ICI'; // Remplacez par le token de votre bot Discord
    const AUTHORIZED_USER_ID = 'VOTRE_ID_UTILISATEUR_DISCORD'; // Remplacez par votre ID Discord
    const AUTO_JOIN_VOICE_CHANNEL_ID = 'VOTRE_ID_SALON_VOCAL_ICI'; // Optionnel : ID du salon vocal à rejoindre au démarrage
    const LOCAL_AUDIO_FILE_NAME = 'loop_audio.mp3'; // Assurez-vous que cela correspond au nom de votre fichier
    ```
    * **TOKEN** : Obtenez-le depuis le [Portail des développeurs Discord](https://discord.com/developers/applications).
    * **AUTHORIZED\_USER\_ID** : Votre ID utilisateur Discord (activez le mode développeur dans Discord, puis faites un clic droit sur votre profil et "Copier l'ID").
    * **AUTO\_JOIN\_VOICE\_CHANNEL\_ID** : L'ID du salon vocal que le bot rejoindra automatiquement au démarrage (facultatif, laissez vide si non souhaité).

6.  **Démarrez le bot** :
    ```bash
    node bot.js
    ```

    Le bot devrait se connecter à Discord et être prêt à recevoir des commandes.

## Déploiement

Pour un déploiement continu et une gestion des processus, il est fortement recommandé d'utiliser un gestionnaire de processus comme [PM2](https://pm2.keymetrics.io/) ou de déployer sur une plateforme supportant Node.js comme Pterodactyl.

### Exemple avec PM2

1.  Installez PM2 globalement :
    ```bash
    npm install pm2 -g
    ```
2.  Démarrez votre bot avec PM2 :
    ```bash
    pm2 start bot.js --name "AmbiancyBot"
    ```
3.  Pour que PM2 redémarre le bot automatiquement au redémarrage du système :
    ```bash
    pm2 startup
    ```
    Suivez les instructions fournies par la commande `pm2 startup`.

## Contribution

Les contributions sont les bienvenues ! Si vous avez des suggestions, des rapports de bugs ou des améliorations, n'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
