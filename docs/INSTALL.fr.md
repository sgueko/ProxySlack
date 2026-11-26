# Installation sous Linux

Prérequis : Bash, curl, Python 3, OpenSSL, sha256sum et sudo pour l’enregistrement système. Sous Slackware, le répertoire Chromium est `/usr/share/chromium/extensions/`. Le script détecte la distribution et les navigateurs ; `--browser chromium` permet de préciser le choix.

Avant la première GitHub Release, compiler avec `PROXYSLACK_KEY_PATH=/chemin/prive/proxyslack.pem ./scripts/sign.sh`, puis lancer `./install.sh --browser chromium --local`. `--dry-run` affiche les chemins sans modifier le système. Après publication, `./install.sh --browser chromium` téléchargera le CRX et vérifiera la somme SHA-256, la signature CRX3, l’identifiant et la version. `--version 1.2.2` choisit une version précise.

L’installation externe utilise un CRX signé et un fichier JSON Linux, sans changer les options de sécurité ou les politiques gérées du navigateur. Redémarrer le navigateur et accepter, si nécessaire, la demande d’installation externe. Certaines versions ou politiques peuvent la bloquer. Les chemins Chrome et Edge viennent de leur documentation officielle ; seul Chromium sous Slackware a été exécuté ici. Brave et Vivaldi sont détectés mais leurs chemins externes ne sont pas validés, donc le script s’arrête. Pour développer, charger `extension/` en mode développeur depuis `chrome://extensions`.

`./update.sh --browser chromium` récupère la dernière version et réinstalle le CRX signé. `./uninstall.sh --browser chromium` retire l’enregistrement externe sans effacer les données du profil. Les mises à jour automatiques par le navigateur restent à vérifier après publication. Voir [distribution](DISTRIBUTION.md).

Pour tester l’installateur sans toucher au navigateur réel : `./install.sh --browser chromium --local --test-root /tmp/proxyslack-check`, puis `./uninstall.sh --browser chromium --test-root /tmp/proxyslack-check`. Les fichiers sont créés uniquement dans ce répertoire temporaire.
