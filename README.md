# ProxySlack

Extension Chromium Manifest V3 en JavaScript natif pour choisir rapidement un proxy HTTP, HTTPS, SOCKS4 ou SOCKS5.

## Installation

1. Décompressez `ProxySlack.zip` si vous utilisez l'archive.
2. Ouvrez `chrome://extensions` dans Chromium, Chrome, Brave ou Edge (dans Edge : `edge://extensions`).
3. Activez **Mode développeur**, cliquez **Charger l’extension non empaquetée** et choisissez le dossier `ProxySlack` contenant `manifest.json`.
4. Épinglez l’extension à la barre d’outils.

L’extension démarre en mode **Réglage navigateur** et n’applique aucun proxy avant votre choix. Cliquez sur un profil pour l’activer. **Mode direct** demande explicitement à Chromium de ne pas utiliser de proxy. **Réglage navigateur** libère le contrôle de ProxySlack pour retrouver le réglage du système, une règle d’entreprise ou une autre extension.

## Profils Tor fournis

| Profil | Protocole | Adresse | Prérequis |
| --- | --- | --- | --- |
| Tor HTTP | HTTP | `127.0.0.1:8118` | Un relais HTTP vers Tor, tel que Privoxy, configuré et démarré. Tor seul n’expose généralement pas ce port. |
| Tor SOCKS5 | SOCKS5 | `127.0.0.1:9050` | Un service Tor SOCKS5 à cette adresse et ce port. Vérifiez la configuration de votre installation. |

Les profils sont des exemples. Leur présence ne lance ni Tor ni Privoxy. Si le service n’écoute pas sur le port choisi, les pages ne chargeront pas.

## Utilisation

- **Nouveau** crée un profil. La case **Appliquer à tous les protocoles** est cochée par défaut, y compris pour les anciens profils importés. Elle envoie les destinations HTTP, HTTPS, FTP et les autres requêtes prises en charge par Chromium vers le même proxy. Si vous la décochez, choisissez le seul protocole de destination qui passera par ce proxy ; les autres utilisent une connexion directe selon les règles de Chromium.
- Le type HTTPS signifie une connexion TLS **vers le serveur proxy** ; ce n’est pas simplement un proxy utilisé pour les sites HTTPS. Le type du profil décrit la connexion **au serveur proxy**, pas les destinations. Ces réglages ne modifient pas la fenêtre de configuration proxy du système d’exploitation.
- **Utiliser** active le profil pour les requêtes Web gérées par le réglage proxy de Chromium. Le badge affiche `ON` pour un profil, `DIR` pour le mode direct et `!` quand le réglage est contrôlé ailleurs.
- **Tester mon IP** interroge par défaut `https://api.ipify.org/?format=json` et affiche l’adresse IP publique visible par ce service. Dans **Paramètres** (⚙), vous pouvez choisir une autre URL HTTPS. Le service doit répondre en `application/json` avec seulement `{ "ip": "adresse" }`, ou en `text/plain` avec seulement l’adresse IP. Les pages HTML, réponses de plus de 512 octets, redirections et valeurs qui ne sont pas des IP sont refusées. Le test échoue si le site ou le proxy est inaccessible. Le résultat ne prouve pas que le proxy ou Tor protège toutes les communications.
- **Exporter JSON** télécharge les profils, sans état actif. **Importer JSON** remplace les profils après confirmation et remet l’extension en mode Réglage navigateur. Limite : 100 profils, fichier de 100 Ko.

Exemple de fichier :

```json
{
  "format": "ProxySlack",
  "version": 1,
  "profiles": [
    { "id": "mon-proxy", "name": "Mon proxy", "type": "socks5", "host": "127.0.0.1", "port": 9050, "applyToAllProtocols": true, "targetProtocol": "http" }
  ]
}
```

## Confidentialité et limites

- Le réglage proxy de Chromium agit sur le trafic réseau du navigateur qui suit ce réglage. Il ne constitue pas un VPN et ne protège pas les autres applications, les extensions qui ouvrent leurs propres connexions, ni forcément WebRTC, DNS et d’autres mécanismes du navigateur ou du système. Ne l’utilisez pas comme garantie d’anonymat.
- Le mode direct peut contourner un proxy configuré au niveau du navigateur. Choisissez-le seulement si vous voulez explicitement une connexion sans proxy.
- Le badge indique le réglage demandé et si ProxySlack contrôle encore l’API proxy. Il ne vérifie pas que le serveur répond ni qu’une connexion particulière est passée par lui.
- SOCKS4 peut entraîner une résolution DNS locale selon la configuration. Préférez SOCKS5 pour le profil Tor. Pour des usages sensibles, utilisez Tor Browser et ses protections intégrées.
- Les profils sont conservés dans `chrome.storage.local` sur l’appareil, sans mot de passe ni synchronisation. L’export JSON contient les hôtes et ports en clair : protégez le fichier si ces informations sont sensibles.
- Le test IP contacte seulement `api.ipify.org` à votre demande. L’extension ne contient ni script de page, ni analyse de l’historique, ni télémétrie.
- Une politique d’entreprise ou une autre extension peut prendre le contrôle du proxy. ProxySlack affiche alors un conflit.

## Permissions

`proxy` : modifier le réglage proxy. `storage` : conserver les profils et paramètres sur l’appareil. Accès hôte intégré à `https://api.ipify.org/*` pour le test par défaut. Pour un site personnalisé, l’accès à cet hôte HTTPS est demandé au moment de l’enregistrement ; l’ancien accès facultatif est retiré si l’hôte change. Aucune permission globale obligatoire de sites, de contenu de page ou d’onglets.

## Langues

L’interface et les métadonnées du manifeste sont disponibles en anglais (langue par défaut) et en français. Dans **Paramètres** (⚙), la langue de l’interface peut suivre le navigateur ou être choisie manuellement. Le choix manuel ne change pas le nom et la description affichés par le gestionnaire d’extensions, qui suivent toujours la langue du navigateur. Le guide anglais est `README.en.html` / `README.en.md`.

## Tests

Dans le dossier `ProxySlack` : `node --test tests/*.test.js`. Les tests vérifient la validation des profils, l’import/export, la configuration proxy et les transitions principales du service. Un essai manuel dans Chromium avec un proxy réel reste nécessaire pour confirmer le comportement réseau de votre installation.
