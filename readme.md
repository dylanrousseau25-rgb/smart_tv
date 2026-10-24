# Free My TV — version Samsung (Tizen)

Un écran d'accueil propre, rapide et sans pub pour les TV Samsung, inspiré de
[Free My TV pour LG webOS](https://github.com/danielthejoker18/FreeMyTvWebOS) (lui-même inspiré de
[free-my-tv](https://github.com/simbasjungles/free-my-tv) pour Google TV).

- **Étagère d'apps** : tes apps (Netflix, YouTube, Prime Video, Disney+, CANAL+, france.tv…) en grand,
  sur une étagère en verre dépoli, lancées d'un appui sur OK. Choix et ordre réglables à la télécommande.
- **Météo + thèmes** : météo locale en direct, prévisions heure par heure, lever/coucher du soleil.
  Le fond passe tout seul du bleu du jour aux couleurs du coucher de soleil puis à la nuit.
  Thèmes manuels : Jour, Coucher de soleil, Nuit, Noir OLED.
- **Veille « tableau »** : après quelques minutes sans rien faire, la TV affiche en plein écran des tableaux
  du domaine public du Metropolitan Museum of Art (chefs-d'œuvre, impressionnistes, paysages, estampes japonaises),
  avec un léger zoom lent, l'heure, le titre et l'artiste. La légende change de coin à chaque tableau pour
  ne pas marquer les écrans OLED. N'importe quelle touche ramène à l'accueil.

Aucun compte ni clé à créer pour la météo (Open-Meteo) ou les tableaux (Met Museum Open Access).

## Télécommande

| Touche | Action |
|---|---|
| Flèches + OK | Se déplacer, ouvrir |
| Retour | Fermer un panneau / quitter l'app |
| Rouge (A) | Réglages |
| Vert (B) | Météo détaillée |
| Bleu (D) | Lancer la veille tableau |

Dans **Réglages** (⚙ en haut à droite) : apps de l'étagère (8 max), ville pour la météo (vide = automatique),
thème, délai de la veille, collection de tableaux et durée par tableau.
**Réorganiser l'étagère** : OK pour saisir une app, ◀ ▶ pour la déplacer, OK pour la poser, Retour pour terminer.

## Essayer sur l'ordinateur

```bash
python3 -m http.server 8765 --directory app
```

Puis ouvre http://localhost:8765 dans un navigateur. Les flèches du clavier, Entrée et Échap remplacent la
télécommande. Hors TV, la liste d'apps est simulée et le lancement affiche juste un message.

## Installer sur la TV

Il faut un Mac (ou PC) sur le même Wi-Fi que la TV, et un compte Samsung (gratuit).

### 1. Installer Tizen Studio sur l'ordinateur

1. Télécharge et installe [Tizen Studio](https://developer.tizen.org/development/tizen-studio/download).
2. Ouvre le **Package Manager** de Tizen Studio, onglet **Extension SDK**, et installe
   **Samsung Certificate Extension** et **TV Extensions** (la version la plus récente).

### 2. Passer la TV en mode développeur

1. Sur la TV, ouvre le panneau **Applications**.
2. Tape **1 2 3 4 5** sur la télécommande (ou sur le pavé numérique à l'écran).
3. Mets **Developer mode** sur **On** et entre l'**adresse IP de ton ordinateur**
   (Mac : Réglages Système > Wi-Fi > Détails > Adresse IP).
4. Redémarre la TV (éteins-la, débranche-la 30 secondes, rebranche-la).
5. Note l'**adresse IP de la TV** : Paramètres > Général > Réseau > État du réseau > Paramètres IP.

### 3. Créer le certificat (une seule fois)

1. Dans Tizen Studio : **Tools > Device Manager**, bouton **Remote Device Manager**, **+**,
   entre l'IP de la TV et active la connexion.
2. **Tools > Certificate Manager**, **+**, choisis **Samsung**, puis **TV**.
3. Nomme le profil **freemytv**, crée un certificat d'auteur, connecte-toi avec ton compte Samsung,
   puis crée le certificat de distributeur : l'identifiant de ta TV est ajouté automatiquement
   puisqu'elle est connectée.

### 4. Installer l'app

```bash
bash scripts/install.sh 192.168.1.42 freemytv
```

(remplace `192.168.1.42` par l'IP de ta TV). L'app **Free My TV** apparaît ensuite dans les applications de la TV.
Pour un accès rapide, déplace-la en première position de la barre d'accueil Samsung.

## Limites connues

- **Le bouton Home de Samsung ne peut pas être remplacé** sans modifier le système de la TV : Free My TV est une
  app qu'on ouvre (la placer en tête de la barre Samsung la met à un clic). C'est la même limite que la version LG.
- **Pas de tuiles HDMI** : Samsung réserve le changement de source aux applications partenaires.
- Si la TV refuse de donner la liste des apps installées, l'app propose les grandes plateformes avec leurs
  identifiants Samsung connus ; certains peuvent varier selon l'année de la TV.
- Code écrit pour fonctionner sur les TV Samsung de 2016 et plus récentes. L'effet de flou du verre n'apparaît
  que sur les modèles de 2021 et après ; les plus anciens ont un fond semi-transparent simple.

## Structure

```
app/
├── config.xml        # Manifeste Tizen (identifiant, permissions)
├── index.html
├── icon.png          # 512×423, généré par scripts/make_icon.py
├── css/style.css
└── js/
    ├── util.js       # Requêtes, stockage, dates en français
    ├── platform.js   # Apps installées, lancement, touches (Tizen) + simulation hors TV
    ├── nav.js        # Navigation aux flèches
    ├── weather.js    # Open-Meteo
    ├── art.js        # Veille tableau (Met Museum)
    └── main.js       # Écran d'accueil, réglages, réorganisation
scripts/
├── install.sh        # Empaquetage signé + installation sur la TV
└── make_icon.py
```

Données : météo [Open-Meteo](https://open-meteo.com), localisation [GeoJS](https://www.geojs.io),
tableaux [The Met Open Access](https://metmuseum.github.io/) (domaine public).
