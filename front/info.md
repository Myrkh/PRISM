Manuel de Sécurité (Safety Manual)
Ce chapitre a pour objectif de fournir à l'utilisateur l'ensemble des recommandations et bonnes pratiques à appliquer lors de l'utilisation du logiciel GRIF, dans un contexte de développement de systèmes soumis aux exigences de sécurité fonctionnelle de la norme IEC 61508. Ce manuel de sécurité est un élément requis dans le cadre de la certification du logiciel et doit être strictement respecté pour garantir la validité des résultats produits par GRIF dans des applications critiques.

Responsabilité de l'utilisateur
Contrôle des entrées : GRIF ne réalise pas de validation complète des valeurs saisies par l'utilisateur. Il est de la responsabilité de ce dernier de s'assurer que les données d'entrée sont cohérentes, réalistes et adaptées au contexte d'étude. L'utilisateur doit éviter toute hypothèse implicite pouvant conduire à des erreurs de modélisation non détectées automatiquement par le logiciel.

Formation : Comme indiqué dans l'IEC61508-1, req 6.2.13, les utilisateurs doivent avoir des compétences appropriées pour intervenir dans le cycle de vie des fonctions instrumentées de sécurité. Avant d'utiliser le logiciel, les utilisateurs doivent s'assurer de disposer des compétences nécessaires à l'utilisation du logiciel, et en particulier ils doivent connaître et comprendre l'ensemble des paramètres pouvant impacter les résultats.

Vérification des résultats
Plausibilité des résultats : L'utilisateur doit systématiquement vérifier que les résultats fournis par GRIF sont plausibles par rapport aux données d'entrée et à son expertise métier. Une incohérence peut indiquer une erreur de modélisation ou un dysfonctionnement logiciel.

Sensibilité du modèle : Lors de modifications de paramétrage (par exemple, taux de défaillance, architecture, délais, ...), il est attendu que les résultats varient de manière cohérente. Une absence de variation ou une variation contre-intuitive doit faire l'objet d'une investigation.

Comparaison entre versions : Lors d'une mise à jour de GRIF, il est impératif de comparer les résultats obtenus avec ceux de la version précédente sur un même modèle d'entrée, afin de détecter tout changement non justifié. Pour cela, ouvrez l'ancien document avec la nouvelle version puis faites un "enregistrer sous" en indiquant un nom suffixé de la version courante. Ensuite réouvrez le nouveau fichier avec la nouvelle version, lancez les calculs et assurez-vous que les résultats sont identiques à ceux de la version précédente du logiciel.

Analyse des courbes : Lorsqu'une courbe représente l'évolution d'un résultat (taux de défaillance, probabilité, indisponibilité, etc.), l'utilisateur doit vérifier que :

les discontinuités apparaissent aux instants attendus,

la tendance de variation est conforme aux comportements physiques ou logiques du système étudié.


Cohérence entre résultats graphiques et valeurs numériques : Les valeurs affichées dans les rapports (panneaux de synthèse, exports, tableaux) doivent être compatibles avec celles visibles sur les courbes et le modèle. Toute contradiction doit être signalée comme une anomalie.

Intégrité du logiciel
Identification de la version utilisée : Afin de garantir la traçabilité et la reproductibilité des résultats, l'utilisateur doit noter la version exacte de GRIF utilisée, y compris :

le numéro de version, disponible dans le menu "À propos"

le SHA ou signature numérique ou dans les informations système du logiciel.


Téléchargement sécurisé : GRIF doit être téléchargé exclusivement à partir du site officiel ou d'un canal validé par l'éditeur. Les empreintes SHA de chaque version peuvent être téléchargées depuis la page https://grif.totalenergies.com/en/services/customer-service/telecharger-grif .

Fichiers de configuration et personnalisation
Fichiers .ini : Les fichiers de configuration générés automatiquement par GRIF ne doivent en aucun cas être modifiés manuellement. Toute modification hors du cadre prévu peut compromettre la validité des résultats et sortir du périmètre de certification. Toute personnalisation du logiciel doit se faire via l'interface prévue à cet effet.

En cas de doute ou d'anomalie
Détection de bug ou comportement inattendu : Si un utilisateur identifie une incohérence, un résultat suspect ou un comportement anormal du logiciel, il doit sauvegarder son modèle et contacter son revendeur en suivant la procédure indiquée dans le manuel d'installation.

Gestion des anomalies : Chaque demande justifiée fera l'objet d'une ouverture de ticket dans le système de gestion des anomalies est en place pour analyser et corriger les dysfonctionnements.

Recommandations générales
Réaliser des revues croisées des modèles et résultats avec des pairs. Documenter systématiquement toutes les hypothèses de modélisation. Archiver les fichiers de projet avec leur version logicielle associée pour toute utilisation dans le cadre d'une évaluation ou d'un audit. Dès le premier affichage d'un message vous invitant à "contacter votre revendeur" cessez d'utiliser le logiciel. Ce message signifie qu'une erreur inconnue et non traitée par le logiciel s'est produite, il faut donc contacter votre revendeur en suivant la procédure détaillée dans le manuel d'installation.

Limites connues
Ressource informatique : comme tout logiciel de calculs scientifiques, les temps de calculs voire leur faisabilité peuvent dépendre de la complexité des modèles et de la performance des ordinateurs utilisés. Dans tous les modules du package booléen, la quantité de mémoire est un facteur limitant. Si la phase de calcul "création du BDD" prend trop de temps ou n'aboutit pas, il se peut qu'il faille augmenter la quantité de mémoire allouée à GRIF et à son moteur de calcul Albizia.

Taille des modèles : Pour la partie capteur, la limite est de 16 canaux de 24 capteurs. Pour la partie actionneurs, la limite est de 24 canaux de 8 actionneurs. Il n'est possible de modéliser qu'un unique composant solveur.

Taille des fichiers : un fichier GRIF ne peut dépasser une taille de 4 Go, cela signifie que l'ensemble des modèles + fichiers joints + images + résultats ne doit pas dépasser cette limite. Attention donc aux tailles des pièces jointes ainsi qu'aux "pas de calcul" trop petits qui produiraient trop de points comme par exemple un test toutes les secondes sur 40 ans qui générerait un fichier gigantesque.

Nommage et emplacement des fichiers : les noms de fichiers ne doivent pas contenir de caractères spéciaux autres que les '-' et '_'. Le chemin du répertoire contenant les fichiers GRIF ne doit également pas contenir de caractères spéciaux. Les fichiers doivent être stockés sur un lecteur local (qui peut correspondre à un emplacement réseau éventuellement).

Environnement Java et système d'exploitation : Le fonctionnement de GRIF n'est garanti que sur la version de Java et des systèmes d'exploitation listés dans le manuel d'installation.

Présentation
Introduction
Le module SIL de GRIF permet aux instrumentistes en charge de la conception ou de la maintenance des architectures SIS (Safety Instrumented System) d'évaluer le niveau d'intégrité de sécurité SIL (Safety Integrity Level) des boucles instrumentées de sécurité selon les normes IEC 61508 et 61511. Les calculs réalisés sont des calculs de PFD ou PFH, l'événement redouté est la défaillance dangereuse non-détectée de la fonction de sécurité du SIS (Safety Instrumented System).

Les définitions et formats des paramètres utilisés dans ce document sont expliqués dans le glossaire (cf. Annexe E, Glossaire)

Ce module s'appuie sur ALBIZIA, le moteur de calcul par BDD (Binary Decision Diagram) développé par TotalEnergies. Le point fort d'ALBIZIA est qu'il est capable d'effectuer des calculs analytiques exacts et de fournir rapidement un très grand nombre d'informations sur le système étudié. Les calculs de probabilités et fréquences sur les formules booléennes ont été certifiés par INERIS, vous trouverez le certificat au format PDF dans le répertoire GRIF202X/Bin/Tools/Albizia

Fenêtre principale du module SIL
La fenêtre principale est décomposée en plusieurs parties :

Barre de titre : La barre de titre indique le nom du module et le nom du fichier en cours d'édition.

Barre de menu : La barre de menu permet d'accéder à toutes les fonctions de l'application.

Barre d'icônes (raccourcis) : La barre de raccourcis est une barre (horizontale) d'icônes permettant d'accéder plus rapidement aux fonctions usuelles. La zone Durée d'exploitation permet de spécifier la durée d'exploitation en années, et de lancer les calculs.

Barre d'outils : La barre d'outils (verticale) permet de sélectionner les éléments graphiques. Par défaut cette barre d'outils n'est pas affichée. Pour la rendre visible cocher l'option du menu Outils : Afficher la barre d'outils graphiques

Zone de saisie : Un maximum de place a été laissé à la zone de saisie graphique pour permettre de réaliser le modèle. Lorsque le module est lancé, cette zone contient une image représentant l'architecture ainsi qu'un graphique vide car aucun calcul n'a encore été réalisé.

Arborescence : L'arborescence est située entre la zone de saisie et la barre d'outils. Elle permet de naviguer dans les pages et groupes du document. Cette arborescence n'est pas visible par défaut.

Panneau configuration : A droite de la zone de saisie, un ensemble de panneau (accessible en cliquant sur le bouton associé dans la barre d'outils à droite) Configuration de l'architecture, Configuration des composants, Rapport, « Les paramètres » et « Les attributs » permet de configurer le système.




Barre d'outils verticale
L'ensemble des outils graphiques est représenté sur la barre d'icônes placée verticalement à gauche de la fenêtre de saisie. Cette barre n'est pas visible par défaut, il faut demander son affichage dans le menu Outils.




La barre d'outils verticale comporte les éléments suivants :

Sélection permet de sélectionner les éléments désirés.

Groupe pour créer un nouveau groupe. Un groupe est une sous-page pouvant elle-même accueillir des éléments graphiques.

Commentaire pour ajouter du texte directement sur le graphique.

Courbe pour tracer des courbes représentant des calculs sur le modèle.

Modes d'édition du module SIL
Le module SIL a deux modes d'édition possible.

le Mode par défaut qui permet d'utiliser le module SIL avec plus d'options.

le Mode simplifié qui permet d'utiliser le module SIL de manière plus simple (notamment dans la configuration des composants) et plus rapide.

Le choix du mode d'édition se fait via le menu Outils puis Options du document.



Le mode d'édition par défaut est expliqué dans les chapitres « Mode d'utilisation par défaut ».

Le mode d'édition simplifié est expliqué dans le chapitre correspondant « Mode d'utilisation simplifié ».

Configuration de l'architecture
L'onglet Configuration de l'architecture est celui qui permet de définir l'architecture. Toutes les modifications effectuées dans cet onglet sont répercutées sur le schéma d'architecture.




Définition de l'architecture
La partie haute de l'onglet Configuration de l'architecture permet de définir la configuration de la partie "Capteurs" de l'architecture. Les choix possibles sont :

Le nombre de canaux de capteurs, jusqu'à 16, et la configuration (logique) entre les canaux (cf. ) ;

Le nombre de composants par canal, jusqu'à 24, et la configuration de ces composants dans le canal ;

La prise en compte de défaillances de cause commune pour l'ensemble des capteurs (cf. ) ;

La prise en compte de défaillances de cause commune pour les capteurs d'un canal particulier ;

La partie basse de l'onglet Configuration de l'architecture permet de définir la configuration de la partie "Actionneurs" de l'architecture. Les choix possibles sont :

Le nombre de canaux d'actionneurs, jusqu'à 24, et la configuration (logique) entre les canaux (cf. ) ;

Le nombre d'actionneurs par canal, jusqu'à 8, et la configuration de ces actionneurs dans le canal ;

Pour chaque actionneur, le nombre de sous-actionneurs (0, 1 ou 2), et la configuration de ces sous-actionneurs ;

La prise en compte de défaillances de cause commune pour l'ensemble des actionneurs. (cf. ) ;

La prise en compte de défaillances de cause commune pour les actionneurs et les sous-actionneurs du canal.

La prise en compte de défaillances de cause commune pour les sous-actionneurs d'un actionneur.


Avertissement
Dans le cas d'architectures parallèles ou redondants, un avertissement apparait lors du lancement des calculs si l'utilisateur n'a pas renseigné des causes communes de défaillances.

Avertissement
Dans le cas d'architectures en série, un avertissement apparait lors du lancement des calculs si l'utilisateur a renseigné des causes communes de défaillances.

Utilisation de la zone de saisie
Il est possible de supprimer, d'ajouter un canal ou de modifier la redondance des canaux à l'aide de la représentation graphique de la boucle instrumentée de sécurité. Un clic droit sur l'ellipse permet d'ajouter ou supprimer des canaux. Dans ce cas la suppression porte sur le dernier canal ajouté.

Un clic droit sur le numéro d'un canal permet de supprimer un canal spécifique.




Votes logiques pour les composants d'un canal
De manière générale, pour un canal, un vote MooN indique que M composants doivent être en seuil (avoir détecté le problème) pour demander que le système surveillé soit mis de sécurité. Pour la partie capteur, le module SIL distingue les votes MooNS (Sécurité) et MooNA(Disponibilité).


Vote avec architecture de type "S" : l'invalidité du capteur est considérée comme une condition de déclenchement (sécurité).




Vote avec architecture de type "A" : l'invalidité du capteur est non déclenchante et seulement alarmée (disponibilité). La logique est modifiée en excluant le capteur dont la panne a été détectée. Dans ce cas de figure, nous définissons un nombre X de pannes détectées à partir duquel le canal déclenche (Trip). Ce nombre est fixé par défaut pour TotalEnergies à la valeur :

3 si 3 composants ou plus
2 si 2 composants
1 si 1 composant




Vote avec architecture de type "M" : même définition que le type "A". Le nombre X de pannes détectées est fixé par manuellement par l'utilisateur.



Les reconfigurations en configuration A sont les suivantes :

1oo3 -> 1oo2 -> 1oo1
2oo3 -> 1oo2 -> 1oo1
3oo3 -> 2oo2 -> 1oo1
MooN -> Moo(N-1)-> Moo(N-2) etc tant que N-i > M, puis M et N sont diminués de 1 jusqu'à arriver à une configuration 2oo3
NooN -> (N-1)oo(N-1) etc jusqu'à 1oo1
Exemple: 4oo8 -> 4oo7 -> 4oo6 -> 4oo5 -> 3oo4 -> 2oo3

Les chapitres suivant expliquent les configurations S et A dans les cas 1oo2 et 2oo3

1oo2S et 1oo2A



2oo3S



2oo3A



Configuration des canaux d'une partie
Vous pouvez sélectionner une configuration de type MooN (M parmi N), dans ce cas, il faut au moins M composants parmi N pour que le sous-système fonctionne. Vous avez aussi la possibilité de saisir vous-même la configuration. Par exemple, lorsqu'il y a 3 canaux à configurer en : canal1 OU (canal2 ET canal3), sélectionnez la configuration manuelle puis saisissez (1 | (2 & 3)) dans la zone de texte. Dans la formule, chaque canal est remplacé par son numéro. Pour le OU logique, il faut utiliser le caractère | (pipe en anglais). Pour le ET il faut utiliser le &. Les opérateurs ayant des priorités différentes, vous devez mettre des parenthèses.

Prise en compte des Défaillance de Cause Commune
Il est possible de définir des défaillances de cause commune sur différents niveaux de l'architecture. Dans tous les cas vous aurez la possibilité de définir un beta (pourcentage de défaillance). Pour les experts, il est possible de demander l'affichage de la configuration de la période des DCC (menu Outils ), il sera alors possible de saisir la période entre chaque test de DCC (en h). Par défaut cette période est automatiquement calculée ( Période auto ) par le logiciel.

Définition des contraintes architecturales
Les contraintes architecturales sont imposées par les normes IEC61508 et IEC61511 afin de limiter le SIL maximum que peux atteindre une architecture donnée en fonction de la tolérence aux fautes matérielles et des caractéristiques des composants. Elles sont indépendentes des PFD et PFH calculés. Les contraintes architecturales diffèrent selon la norme choisie. Ce chapitre résume les différentes contraintes architecturales d'une fonction instrumentée de sécurité en fonction de la norme.

Définition
SFF : Safe Falure Fraction

HFT : Hardware Fault Tolerence

Composants Fiabilisé/Standard/Non sécurité: L'anciennne IEC61511 de 2003 faisait référence à différentes caractéristiques (sécurité positive/eprouvé/certifié etc ...) afin de calculer le SIL maximum. Ces différences ont disparu avec la version 2016 de la norme.

Type A : Composant de Type A au sens de l'IEC 61508

Type B Composant de Type B au sens de l'IEC 61508

Se référer aux normes pour plus de précision. Seul des extraits sont présentés

La route 1H de l'IEC 61508
Selon le chapitre 7.4.4.2 de l'IEC 61508-2, les tableaux suivant indiquent le SIL maximum atteignable en fonction de la proportion des pannes sures (SFF = Safe Failure Fraction) et de la tolérance au fautes matérielles (HFT: Hardware fault tolerance).

Type A :

La route 2H de l'IEC 61508
Selon le chapitre 7.4.4.3 de l'IEC 61508-2, le SIL maximum atteignable en fonction de la tolérance aux fautes matérielles (HFT: Hardware fault tolerance) est:



La route 2H de l'IEC 61508 - Chap 7.4.4.3.2
Pour les éléments de type A uniquement et si l'utilisateur apporte les justifications nécessaires (IEC61508-2 Chap 7.4.4.3.2), le HFT peut être réduit de 1 dans le tableau précédent.

Si HFT ≥ 1 ⇒ SIL 4;
Si HFT = 0 ⇒ SIL 3;

IEC 61511 - Version 2016
Exigences de HFT minimale en fonction du SIL


IEC 61511 - Version 2016 - Chap 11.4.6
Pour un SIS ou un sous-système SIS qui n'utilise pas d'appareils programmables FVL ou LVL, et si la HFT minimale spécifiée au Tableau 6 donne lieu à des défaillances supplémentaires et à une moindre sécurité du processus global, alors la HFT peut être réduite. Cela doit être justifié et documenté. La justification doit apporter la preuve que l'architecture proposée est apte à assurer son utilisation prévue et satisfait aux exigences concernant l'intégrité de sécurité.


Si HFT ≥ 1 ⇒ SIL 4;
Si HFT = 0 ⇒ SIL 3;

Configuration de la norme à appliquer pour les contraintes
Le choix de la norme qui sera utilisée pour calculer le SIL maximum atteignable se fait dans le menu Données et calculs/Norme appliquée pour les contraintes. Ce choix sera valable pour toutes les boucles du document, aussi bien pour la partie capteurs que pour la partie actionneurs.

Si vous souhaitez specifier une norme particulière pour une partie d'une boucle, il est possible d'activer l'option : Données et calculs/Configurer des normales spécifiques aux parties, dans ce cas, l'onglet d'architecture présentera une zone Norme spécifique à la partie qui permettra de choisir specifiquement la norme pour chaque partie.
Configuration des composants
L'objectif est de spécifier les valeurs propres à chaque élément de la SIF étudiée.

Ceci s'effectue à travers différents onglets de la fenêtre de configuration :

un onglet Capteurs contient le paramétrage des capteurs de la boucle de sécurité (cf. « Paramétrage des capteurs »),
un onglet Solveur contient le paramétrage du solveur (cf. « Paramétrage du solveur »),
un onglet Actionneurs contient le paramétrage des actionneurs (cf. « Paramétrage des actionneurs »),


Note
Dans la suite, toutes les valeurs numériques saisies peuvent être des réels dont le séparateur décimal est le point. Il est possible de les écrire sous la forme 0.0000015 ou en notation scientifique 1.5E-6 .

Paramétrage des capteurs
Les capteurs de la boucle de sécurité sont paramétrables via l'onglet Configuration des composants/Partie Capteur(s). Chaque capteur est accessible séparément via sous les sous onglets S1.1, S1.2, etc. Le premier nombre (avant le point) est le numéro du canal, le second (après le point) est la position dans le canal.

La configuration des capteurs peut aussi se faire par un double clique dans la zone de saisie sur le capteur que l'utilisateur souhaite paramètrer.



Note
Dans le paragraphe suivant, le capteur sera dénommé "le composant".

Composant existant
Le composant peut déjà être utilisé à un autre endroit du système. Dans ce cas, nous avons à faire à un composant existant. C'est par exemple le cas si l'on veut qu'un composant soit commun à deux canaux. Le composant de référence est alors sélectionnable dans la liste déroulante. Il peut s'agir d'un composant de la SIF courante, ou d'un composant existant dans une autre boucle de sécurité du document. Cette fonctionnalité n'est accessible que lorsque la SIF comporte plusieurs composants de même nature, ou que le document contient plusieurs SIF.

Identification
Repère : correspond au repère instrument du composant sur les schémas PID (ex : 10 PT 2034 pour un capteur, 10 UV 2034 pour un actionneur ou 10_ESD_06 pour un solveur).

A côté du champs Repère deux icônes offrent des options d'export et d'import de paramètre soit à partir de fichier xml soit depuis une base de données.

Importer/Exporter les propriétés du composant au format xml  . Six actions sont proposées sous la forme d'un menu déroulant affiché lors d'un clic gauche sur le bouton:



Sauvegarder comme modèle par défaut : enregistre les caractéristiques du composant dans le modèle par défaut.

Réinitialiser aux valeurs par défaut : recopie dans le composant les caractéristiques stockées dans le modèle par défaut.

Sauvegarder dans un fichier de modèle : enregistre les caractéristiques du composant dans un fichier modèle dont on indique l'emplacement. Ce fichier pourra être réutilisé ou envoyé à une autre personne.

Utiliser un modèle : recopie dans le composant les caractéristiques stockées dans un modèle dont on spécifie l'emplacement.

Connecter à un modèle : permet de connecter le composant à des modèles de composant stockés dans un modèle dont on spécifie l'emplacement. Le nom du fichier où le modèle se situe est par la suite spécifié à gauche de ce bouton.

Déconnecter à un modèle : déconnecte le composant des modèles.


Base de composants  En cliquant sur l'icône trois actions sont disponibles.



Utiliser un composant : recopie dans le composant les caractéristiques stockées dans la base de composant.

Connecter à un composant : permet de connecter le composant à un composant de la base de composant. Le nom du fichier où le composant se situe est par la suite spécifié à gauche de ce bouton.

Déconnecter un composant : déconnecte le composant de la base de composant.


Identique à : permet de spécifier si le composant est identique à un autre composant de même nature (par exemple un autre capteur dans le cas de l'édition d'un capteur).

En cliquant sur le bouton  il est possible de Recopier les paramètres d'un autre composant.

Cette action permet de recopier les paramètres d'un autre composant de même nature. Cette fonctionnalité n'est accessible que lorsque la SIF comporte plusieurs composants de même nature. Seules la caractéristique Repère, n'est pas recopiée. Les composants disponibles sont les mêmes que ceux présentés pour la fonctionnalité Identique à.


Avertissement
A la différence de l'option Composant existant, le composant n'est pas le même que celui sélectionné, ils sont physiquement distincts mais ils ont les mêmes paramètres. Le composant référence est sélectionnable dans la liste déroulante. Cette fonctionnalité n'est accessible que lorsque la SIF comporte plusieurs composants de même nature. Si la case à cocher est cochée, seul le Repère du composant est éditable (les autres étant identiques au composant référence).

Catégorie d'instrument : correspond à la catégorie utilisé et permet une meilleur classification des capteurs et des actionneurs. Ils sont sélectionnable depuis une liste déroulante ci-dessous. Pour les capteurs :


Pour les actionneurs :



Type d'instrument : correspond au type d'instrument utilisé. Ils sont sélectionnable depuis une liste déroulante. Cette liste est mise à jour régulièrement.

Fabricant : permet de renseigner le nom du fabricant du composant.

Source des données : indique d'où les données de fiabilité sont extraites.

Description : est un champ libre où l'utilisateur peut ajouter sa propre description du composant.


Attention
Dans la base de composants, ces informations sont à renseigner dans les colonnes:

ID

REPERE

DESCRIPTION

INSTRUMENTED_TYPE : l'ensemble des types de composant est donné dans l' Annexe C, Liste des composants

MANUFACTURER

DATA_SOURCE



Caractère déterminé du composant
Caractère déterminé du composant permet de spécifier le caractère déterminé du composant. Le composant est caractérisé par un des trois caractères disponibles.

Non type A/B : indique que le composant est à sécurité négative (à émission) et sans autodiagnostic. Correspond au type NS (Composant non sécurité) des versions antérieures à 2013.

Type B : indique que le composant est à sécurité positive (à manque) ou avec autodiagnostic. Correspond au type S (Composant standard) des versions antérieures à 2013.

Type A : indique que le composant est à sécurité positive (à manque) et éprouvé par l'usage (ou certifié) et avec autodiagnostic (ou avec mise en œuvre de plusieurs tests) et protégé en accès aux réglages internes. Correspond au type F (Composant fiabilisé) des versions antérieures à 2013.


Attention
Dans la base de composants, ces informations sont à renseigner dans la colonne DETERMINED_CHARACTER :

NS pour les composants non type A/B;
S pour les composants de type B;
F pour les composants de type A;


Test
Type de test : permet de spécifier le type de test du composant. Deux types de test sont sélectionnables grâce au menu déroulant :

Test unité à l'arrêt : signifie que le composant est testé lorsque l'unité est à l'arrêt. Le test ne nuit pas à la fonction de sécurité puisque l'unité ne fonctionne plus.

Test unité en marche : signifie que le composant est testé lorsque l'unité est en marche. Le composant n'est plus disponible pour sa fonction et cela influe sur la fonction de sécurité. Par exemple, cela doit être utilisé lorsqu'un capteur est by-passé pour être testé alors que l'installation n'est pas arrêtée.


Note
Il est aussi possible d'indiquer qu'aucun test périodique ne sera effectué sur le composant.

Intervalle entre tests (T1) : correspond à la durée qui sépare deux tests du composant. L'unité de temps est sélectionnable grâce à une liste déroulante ( heures , jours , mois , années ).

Date du premier test (T0) : correspond à la date à laquelle est réalisé le premier test du composant. Les modes d'édition de cette caractéristique (valeur et unité) sont les mêmes que pour l'intervalle entre tests.


Attention
Dans la base de composants, ces informations sont à renseigner dans les colonnes:

TEST_TYPE :

TESTUNITWORK pour Test unité en marche;
TESTUNITSTOP pour Test unité à l'arrêt;
EXP pour Non testé;

T0 : premier test;

T0_UNIT :HOUR, DAY, MONTH ou YEAR;

T1 : intervalle de tests;

T1_UNIT :HOUR, DAY, MONTH ou YEAR.



Paramètres de l'instrument
Cette partie regroupe l'ensemble des données de fiabilité pour un composant.

Pour les taux de défaillance il existe deux manières distinctes de les renseigner:

de manière factorisée en rentrant les paramètres suivant:



Lambda λ : correspond aux taux de défaillances du composant (h-1).

LambdaD/Lambda (λd/λ) : correspond à la proportion de défaillances dangereuses parmi les défaillances totales.

DCd : correspond à la couverture du diagnostic en ligne des pannes dangereuses. C'est un taux compris entre 0 et 100%. Un taux de 0% signifie qu'aucune panne dangereuse ne pourra être détectée.

DCs : correspond à la couverture du diagnostic en ligne des pannes sures. C'est un taux compris entre 0 et 100%. Un taux de 0% signifie qu'aucune panne sure ne pourra être détectée.


Note
Toutes ces valeurs sont éditables manuellement ou sélectionnables à l'aide de la completion automatique dans le cas d'usage de paramètres.

de manière dévelopée en rentrant les paramètres suivant:



Lambda Du (λ du) : correspond au taux de défaillance des pannes non détectées du composant (h-1).

Lambda DD (λ dd) : correspond au taux de défaillance des pannes détectées du composant (h-1).

Lambda SU (λ su) : correspond au taux de défaillance des pannes sures non détectées du composant (h-1).

Lambda SD (λ sd) : correspond au taux de défaillance des pannes sures détectées du composant (h-1).


Note
Toutes ces valeurs sont éditables manuellement ou sélectionnables à l'aide de la completion automatique dans le cas d'usage de paramètres.

SFF (Safe Failure Fraction) en % : correspond au taux de panne sure (λsd + λsu + λdd) / λ
Note
Ce champ n'est pas éditable.
MTTR : correspond au temps moyen entre la détection et la réparation d'un composant (Mean Time To Repair). L'unité de temps est sélectionnable grâce à une liste déroulante ( heures , jours , mois , années ). Cette valeur est éditable manuellement ou sélectionnable à l'aide de la completion automatique.


Note
Ce champ n'est éditable que si DCd ou λ DD sont différents de 0 ou si Type de test est égale à Test unité en marche .

Défaillance due au test γ (Gamma) : correspond à la probabilité [0,1] que le test engendre une défaillance du matériel. La valeur 0 signifiera que les tests ne provoquent pas de défaillance. La valeur 1 signifiera que tous les tests effectués provoqueront une défaillance. Cette valeur est éditable manuellement ou sélectionnable à l'aide de la completion automatique.


Note
Ce champ n'est éditable que si DC est différent de 0 ou si Type de test est différent de Non testé .


Attention
Dans la base de composants, ces informations sont à renseigner dans les colonnes:

MODE : DEVELOPED ou FACTORISED

LAMBDA ;

DFF ;

DC_D ;

DC_S ;

LAMBDA_DU ;

LAMBDA_DD ;

LAMBDA_SU ;

LAMBDA_SD ;

MTTR ;

MTTR_UNIT : HOUR, DAY, MONTH ou YEAR;

GAMMA .





Il est possible de spécifier les paramètres plus spécifiques en renseignant la partie Paramètres avancés.




Les paramètres avancés du capteur sont les suivants :


Composant disponible durant le test (X) : spécifie si le composant peut assurer sa mission de sécurité durant le test (si la case est cochée).

Lambda durant le test λ* : correspond au taux de défaillances du composant durant le test du matériel (h-1). Il se peut que les conditions de test provoquent un stress supplémentaire et augmentent le lambda. Il est possible d'indiquer que la valeur soit égale à celle du lambda (λ du).

Durée du test π (Pi) : correspond à la durée nécessaire au test du composant. L'unité de temps est sélectionnable grâce à une liste déroulante (heures, jours, mois, années).


Note
Ce champ n'est éditable que si Type de test est égale à Test unité en marche.

Efficacité du test σ (Sigma) : correspond au taux de couverture ou d'efficacité du test. Cette valeur est comprise entre 0 (le test ne détecte jamais rien) et 1 (le test détecte toujours la panne).

Oubli de reconfiguration après test ω1 (Omega1) : correspond à la probabilité [0,1] d'oubli de reconfiguration du matériel après le test. Il s'agit de la probabilité que l'opérateur ne remette pas le composant dans l'état d'assurer sa mission de sécurité après le test. On peut la laisser à 0 si on estime que les opérateurs et les procédures de tests sont infaillibles (pas d'oubli du "by-pass" sur un capteur, remise du moteur sous tension, ...).

Oubli de reconfiguration après réparationω2 (Omega2) : correspond à la probabilité [0,1] d'oubli de reconfiguration du matériel après la réparation (ou changement). Il s'agit de la probabilité que l'opérateur ne remette pas le composant dans l'état d'assurer sa mission de sécurité après la réparation. On peut la laisser à 0 si on estime que les opérateurs et les procédures de réparation sont infaillibles (moteur neuf sous tension, ...).

Couverture du test d'épreuve : permet de spécifier si le composant est testé sur toutes ses défaillances, ou si le composant n'est testé que sur une partie de ses défaillances. Si un composant est testé sur toutes ses défaillances, alors la couverture du test d'épreuve est de 100% (valeur par défaut). Si qu'une partie du composant est testé, alors il est possible de spécifier le pourcentage de cette couverture.

Durée de vie du composant: précise si le composant sera remplacé une fois que sa durée de vie est terminée pour être remis à neuf. Ce paramètre est lié à la Couverture du test d'épreuve : la où ce dernier précise à quel pourcentage le composant va être réparé (et donc à quel pourcentage le PFD revient à 0), la durée de vie du composant permet de remettre le PFD du composant à 0. Il n'a donc pas d'intérêt si la Couverture du test d'épreuve est à 100%. La Durée de vie du composant doit être un multiple de la Couverture de test d'épreuve. L'efficacité du test σ, l'oublie de reconfiguration après testω1, et l'oubli de reconfiguration après réparation ω2 sont aussi pris en compte lors du remplacement par un nouveau composant. Un champ vide indique que le composant ne sera pas remplacé sur la durée des années d'exploitation.

HFT précise quel est le HFT propre au composant. Il est possible qu'un composant ne soit modélisé que par un seul composant virtuel dans le modèle, mais qu'en réalité, il représente deux ou plus composant matériel. Dans ce cas-la, il est possible de renseigner un HFT spécifique au composant, pour préciser qu'il s'agit en réalité de plusieurs composants. Par défaut, la valeur d'un HFT est 0 : si un composant virtuel représente deux composants matériel, alors son HFT est de 1.




Attention
Dans la base de composants, ces informations sont à renseigner dans les colonnes:

X : FALSE ou TRUE;

LAMBDASTAR;

LAMBDASTAR_EQUALTO_LAMBDA : FALSE ou TRUE;

PI

PI_UNIT :HOUR, DAY, MONTH ou YEAR;

SIGMA;

OMEGA1;

OMEGA2.

PROOF_TEST_COVERAGE.

LIFETIME

LIFETIME_UNIT:HOUR, DAY, MONTH or YEAR;

HFT




DC seulement alarmé : il s'agit du poucentage des pannes détectées qui sont seulement alarmées (et donc non déclenchantes). Ce champ n'est disponible que si le canal est en mode M.


Attention
Dans la base de composants, ces informations sont à renseigner dans la colonne :

DC_ONLY_ALARMED : pourcentage des DC seuleument alarmées.





Test de course partielle : si cette option est cochée, on effectue sur celui ci des tests de course partielle. Par exemple une vanne équipée d'un test de course partielle de son opercule.

Rappel important sur les pannes dangereuses non détectées : Les pannes dangereuses non détectées sont des pannes que le diagnostic en ligne ne détecte pas, la détection ne peux se faire que lors des tests "complet" du composant lors des test d'épreuve (proof test). Cependant, lors des tests partiels, cette part de pannes peut être détectée.


Nous avons donc la décomposition suivante de ces pannes lors de ces tests partiels :


- une part de panne "Dangereuse Non Détectée" détectées par les tests partiels entre deux tests complets. Cette part dépend de la couverture du test partiel et est modélisée à l'aide d'une loi test périodique complète à 11 paramètres.


- une part de pannes "Dangereuse jamais détectées" qui ne peuvent être détectées ni par le diagnostic en ligne, ni par les tests partiels et ni par les tests complets. Cette partie est modélisée soit par une loi exponentielle s'il n'y a pas de durée de vie renseignée sur le composant, soit par une loi de test périodique simple s'il y a une durée de vie renseignée sur ce dernier.


Composant disponible durant le test (X) : spécifie si le composant peut assurer sa mission de sécurité durant le test (si la case est cochée).

Durée du test π (Pi) : correspond à la durée nécessaire au test du composant. L'unité de temps est sélectionnable grâce à une liste déroulante (heures, jours, mois, années).

Part des pannes détectées : Proportion des pannes dangeureuses détectées lors des tests de course partielle (de 0 à 100%). 0% signifie qu'aucune panne n'est détectée, 100% signifie que toutes les pannes sont détectées. La valeur de l'efficacité est éditable manuellement ou par complétion automatique.

Nombre de tests de course partielle : nombre de tests de course partielle effectués entre deux tests complets.




Attention
Dans la base de composants, ces informations sont à renseigner dans les colonnes:

WITH_PARTIALSTROKING : TRUE ou FALSE;

PARTIALSTROKING_X : TRUE ou FALSE;

PARTIALSTROKING_PI;

PARTIALSTROKING_PI_UNIT :HOUR, DAY, MONTH ou YEAR;

PARTIALSTROKING_EFFICACITY;

PARTIALSTROKING_NBTESTS.






Paramétrage du solveur
Le solveur de la boucle de sécurité est paramétrable via l'onglet Solveur ou par un double clique dans la zone de saisie sur le solveur que l'utilisateur souhaite paramètrer.


Note
Dans le paragraphe suivant, le solveur sera dénommé "le composant".
Solveur existant
Le solveur peut être commun à plusieurs SIF et avoir déjà été défini dans un solveur existant du document courant. Le solveur de référence est alors sélectionnable dans la liste déroulante. Cette fonctionnalité n'est accessible que lorsque le document contient plusieurs SIF.

Identification
Repère : correspond au repère instrument du composant sur les schémas PID (ex : 10 PT 2034 pour un capteur, 10 UV 2034 pour un actionneur ou 10_ESD_06 pour un solveur).

A côté du champs Repère deux icônes offrent des options d'export et d'import de paramètre soit à partir de fichier xml soit depuis une base de données.

Importer/Exporter les propriétés du composant au format xml  . Six actions sont proposées sous la forme d'un menu déroulant affiché lors d'un clic gauche sur le bouton:



Sauvegarder comme modèle par défaut : enregistre les caractéristiques du composant dans le modèle par défaut.

Réinitialiser aux valeurs par défaut : recopie dans le composant les caractéristiques stockées dans le modèle par défaut.

Sauvegarder dans un fichier de modèle : enregistre les caractéristiques du composant dans un fichier modèle dont on indique l'emplacement. Ce fichier pourra être réutilisé ou envoyé à une autre personne.

Utiliser un modèle : recopie dans le composant les caractéristiques stockées dans un modèle dont on spécifie l'emplacement.

Connecter à un modèle : permet de connecter le composant à des modèles de composant stockés dans un modèle dont on spécifie l'emplacement. Le nom du fichier où le modèle se situe est par la suite spécifié à gauche de ce bouton.

Déconnecter à un modèle : déconnecte le composant des modèles.


Base de composants  En cliquant sur l'icône trois actions sont disponibles.



Utiliser un composant : recopie dans le composant les caractéristiques stockées dans la base de composant.

Connecter à un composant : permet de connecter le composant à un composant de la base de composant. Le nom du fichier où le composant se situe est par la suite spécifié à gauche de ce bouton.

Déconnecter un composant : déconnecte le composant de la base de composant.


Identique à : permet de spécifier si le composant est identique à un autre composant de même nature (par exemple un autre capteur dans le cas de l'édition d'un capteur).

En cliquant sur le bouton  il est possible de Recopier les paramètres d'un autre composant.

Cette action permet de recopier les paramètres d'un autre composant de même nature. Cette fonctionnalité n'est accessible que lorsque la SIF comporte plusieurs composants de même nature. Seules la caractéristique Repère, n'est pas recopiée. Les composants disponibles sont les mêmes que ceux présentés pour la fonctionnalité Identique à.


Avertissement
A la différence de l'option Composant existant, le composant n'est pas le même que celui sélectionné, ils sont physiquement distincts mais ils ont les mêmes paramètres. Le composant référence est sélectionnable dans la liste déroulante. Cette fonctionnalité n'est accessible que lorsque la SIF comporte plusieurs composants de même nature. Si la case à cocher est cochée, seul le Repère du composant est éditable (les autres étant identiques au composant référence).

Catégorie d'instrument : correspond à la catégorie utilisé et permet une meilleur classification des capteurs et des actionneurs. Ils sont sélectionnable depuis une liste déroulante ci-dessous. Pour les capteurs :


Pour les actionneurs :



Type d'instrument : correspond au type d'instrument utilisé. Ils sont sélectionnable depuis une liste déroulante. Cette liste est mise à jour régulièrement.

Fabricant : permet de renseigner le nom du fabricant du composant.

Source des données : indique d'où les données de fiabilité sont extraites.

Description : est un champ libre où l'utilisateur peut ajouter sa propre description du composant.


Attention
Dans la base de composants, ces informations sont à renseigner dans les colonnes:

ID

REPERE

DESCRIPTION

INSTRUMENTED_TYPE : l'ensemble des types de composant est donné dans l' Annexe C, Liste des composants

MANUFACTURER

DATA_SOURCE



Configuration
Il existe deux types de défaillances au sein du solveur: Panne dangereuse et Panne sûre.

Type de configuration : spécifie le type de configuration du solveur de la panne sélectionnée. Trois types de configuration sont sélectionnables grâce au menu déroulant :

Simple : le solveur est modélisé par une loi constante.

Avancée : le solveur est modélisé par une loi test périodique complet. Ce type de défaillance n'est possible que pour la panne dangereuse.

Loi spécifique : l'utilisateur choisit la loi qu'il veut pour modéliser le solveur.



Attention
Dans la base de composants, ces informations sont à renseigner dans la colonne TEST_TYPE

CST : le solveur est modélisé par une loi constante;

TPC : le solveur est modélisé par une loi test périodique complet;

LAW_SPEC : l'utilisateur choisit la loi qu'il veut pour modéliser le solveur;



Paramètre de l'instrument
Les paramètres du solveur sont décrits dans la partie Paramètres de l'instrument . Ils dépendent du type de configuration sélectionnée.

Pour une configuration simple, les paramètres sont les suivants :

PFD du solveur : correspond à la probabilité de non-fonctionnement du solveur au moment de sa sollicitation. Cette valeur est éditable manuellement ou sélectionnable à l'aide de la completion automatique.

SIL (calculé à partir de la PFD) : présente automatiquement le SIL du solveur calculé à partir de la PFD du solveur.

PFH : correspond au PFH du solver qui est donné par le fournisseur ou par le retour d'expérience.

SIL (calculé à partir de la PFH) : présente automatiquement le SIL du solveur calculé à partir de la PFH du solveur.


Pour une configuration avancée, les paramètres sont les suivants :




Intervalle entre tests (T1) : correspond à la durée qui sépare deux tests du composant. L'unité de temps est sélectionnable grâce à une liste déroulante ( heures , jours , mois , années ). La valeur de la durée est éditable manuellement ou sélectionnable à l'aide de la complétion automatique.

Date du premier test (T0) : correspond à la date à laquelle est réalisé le premier test du composant. Les modes d'édition de cette caractéristique (valeur et unité) sont les mêmes que pour l'intervalle entre tests.


Lambda Du (λ du) : correspond au taux de défaillance des pannes non détectées du composant (h-1). Cette valeur est éditable manuellement ou sélectionnable dans une liste déroulante présentant tous les paramètres de dimension Taux .

MTTR : correspond au temps moyen entre la détection et la réparation d'un composant (Mean Time To Repair). L'unité de temps est sélectionnable grâce à une liste déroulante ( heures , jours , mois , années ). La valeur du temps est éditable manuellement ou sélectionnable dans une liste déroulante présentant tous les paramètres de dimension Durée .

Défaillance due au test γ (Gamma) : correspond à la probabilité [0,1] que le test engendre une défaillance du matériel. La valeur 0 signifiera que les tests ne provoquent pas de défaillance. La valeur 1 signifiera que tous les tests effectués provoqueront une défaillance. Cette valeur est éditable manuellement ou sélectionnable dans une liste déroulante présentant tous les paramètres de dimension Probabilité .



Attention
Dans la base de composants, ces informations sont à renseigner dans les colonnes:

PFD

PFH

T0 : premier test;

T0_UNIT :HOUR, DAY, MONTH ou YEAR;

T1 : intervalle de tests;

T1_UNIT :HOUR, DAY, MONTH ou YEAR.

LAMBDA_DU ;

MTTR;

MTTR_UNIT : HOUR, DAY, MONTH ou YEAR;

GAMMA.




D'autres paramètres sont disponibles grâce à un clic sur le bouton Configuration avancée... (uniquement pour un solveur configuré en mode avancé).





Composant disponible durant le test (X) : spécifie si le composant peut assurer sa mission de sécurité durant le test (si la case est cochée).

Lambda durant le test λ* : correspond au taux de défaillances du composant durant le test du matériel (h-1). Il se peut que les conditions de test provoquent un stress supplémentaire et augmentent le lambda. Il est possible d'indiquer que la valeur soit égale à celle du lambda (λ du).

Durée du test π (Pi) : correspond à la durée nécessaire au test du composant. L'unité de temps est sélectionnable grâce à une liste déroulante (heures, jours, mois, années).


Note
Ce champ n'est éditable que si Type de test est égale à Test unité en marche.

Efficacité du test σ (Sigma) : correspond au taux de couverture ou d'efficacité du test. Cette valeur est comprise entre 0 (le test ne détecte jamais rien) et 1 (le test détecte toujours la panne).

Oubli de reconfiguration après test ω1 (Omega1) : correspond à la probabilité [0,1] d'oubli de reconfiguration du matériel après le test. Il s'agit de la probabilité que l'opérateur ne remette pas le composant dans l'état d'assurer sa mission de sécurité après le test. On peut la laisser à 0 si on estime que les opérateurs et les procédures de tests sont infaillibles (pas d'oubli du "by-pass" sur un capteur, remise du moteur sous tension, ...).

Oubli de reconfiguration après réparationω2 (Omega2) : correspond à la probabilité [0,1] d'oubli de reconfiguration du matériel après la réparation (ou changement). Il s'agit de la probabilité que l'opérateur ne remette pas le composant dans l'état d'assurer sa mission de sécurité après la réparation. On peut la laisser à 0 si on estime que les opérateurs et les procédures de réparation sont infaillibles (moteur neuf sous tension, ...).

Couverture du test d'épreuve : permet de spécifier si le composant est testé sur toutes ses défaillances, ou si le composant n'est testé que sur une partie de ses défaillances. Si un composant est testé sur toutes ses défaillances, alors la couverture du test d'épreuve est de 100% (valeur par défaut). Si qu'une partie du composant est testé, alors il est possible de spécifier le pourcentage de cette couverture.

Durée de vie du composant: précise si le composant sera remplacé une fois que sa durée de vie est terminée pour être remis à neuf. Ce paramètre est lié à la Couverture du test d'épreuve : la où ce dernier précise à quel pourcentage le composant va être réparé (et donc à quel pourcentage le PFD revient à 0), la durée de vie du composant permet de remettre le PFD du composant à 0. Il n'a donc pas d'intérêt si la Couverture du test d'épreuve est à 100%. La Durée de vie du composant doit être un multiple de la Couverture de test d'épreuve. L'efficacité du test σ, l'oublie de reconfiguration après testω1, et l'oubli de reconfiguration après réparation ω2 sont aussi pris en compte lors du remplacement par un nouveau composant. Un champ vide indique que le composant ne sera pas remplacé sur la durée des années d'exploitation.

HFT précise quel est le HFT propre au composant. Il est possible qu'un composant ne soit modélisé que par un seul composant virtuel dans le modèle, mais qu'en réalité, il représente deux ou plus composant matériel. Dans ce cas-la, il est possible de renseigner un HFT spécifique au composant, pour préciser qu'il s'agit en réalité de plusieurs composants. Par défaut, la valeur d'un HFT est 0 : si un composant virtuel représente deux composants matériel, alors son HFT est de 1.




Attention
Dans la base de composants, ces informations sont à renseigner dans les colonnes:

X : FALSE ou TRUE;

LAMBDASTAR;

LAMBDASTAR_EQUALTO_LAMBDA : FALSE ou TRUE;

PI

PI_UNIT :HOUR, DAY, MONTH ou YEAR;

SIGMA;

OMEGA1;

OMEGA2.

PROOF_TEST_COVERAGE.

LIFETIME

LIFETIME_UNIT:HOUR, DAY, MONTH or YEAR;

HFT



Pour une loi spécifique, l'utilisateur à le choix parmi l'ensemble des lois présentes dans Albizia (cf. Annexe D, Lois )

Paramétrage des actionneurs
Les actionneurs de la boucle de sécurité sont paramétrables via l'onglet Configuration des composants/Partie Actionneur(s). Les actionneurs peuvent être classifiés de la manière suivante :

Actionneurs principaux : Ils possèdent 0, 1 ou 2 actionneurs secondaires.

Actionneurs secondaires : ils sont placés en séries avec leur actionneur principal respectif. Les actionneurs secondaires d'un même actionneur principal sont placés en série (2oo2) ou en parallèle (1oo2).

Chaque actionneur principal est accessible séparément via sous les sous onglets A1.1, A1.2, ..., et sous-actionneurs via sous les sous onglets A1.1a, A1.1b, ...


Dans le paragraphe suivant, l'actionneur (principal ou secondaire) sera dénommé "le composant".

Composant existant
Le composant peut déjà être utilisé à un autre endroit du système. Dans ce cas, nous avons à faire à un composant existant. C'est par exemple le cas si l'on veut qu'un composant soit commun à deux canaux. Le composant de référence est alors sélectionnable dans la liste déroulante. Il peut s'agir d'un composant de la SIF courante, ou d'un composant existant dans une autre boucle de sécurité du document. Cette fonctionnalité n'est accessible que lorsque la SIF comporte plusieurs composants de même nature, ou que le document contient plusieurs SIF.

Identification
Repère : correspond au repère instrument du composant sur les schémas PID (ex : 10 PT 2034 pour un capteur, 10 UV 2034 pour un actionneur ou 10_ESD_06 pour un solveur).

A côté du champs Repère deux icônes offrent des options d'export et d'import de paramètre soit à partir de fichier xml soit depuis une base de données.

Importer/Exporter les propriétés du composant au format xml  . Six actions sont proposées sous la forme d'un menu déroulant affiché lors d'un clic gauche sur le bouton:



Sauvegarder comme modèle par défaut : enregistre les caractéristiques du composant dans le modèle par défaut.

Réinitialiser aux valeurs par défaut : recopie dans le composant les caractéristiques stockées dans le modèle par défaut.

Sauvegarder dans un fichier de modèle : enregistre les caractéristiques du composant dans un fichier modèle dont on indique l'emplacement. Ce fichier pourra être réutilisé ou envoyé à une autre personne.

Utiliser un modèle : recopie dans le composant les caractéristiques stockées dans un modèle dont on spécifie l'emplacement.

Connecter à un modèle : permet de connecter le composant à des modèles de composant stockés dans un modèle dont on spécifie l'emplacement. Le nom du fichier où le modèle se situe est par la suite spécifié à gauche de ce bouton.

Déconnecter à un modèle : déconnecte le composant des modèles.


Base de composants  En cliquant sur l'icône trois actions sont disponibles.



Utiliser un composant : recopie dans le composant les caractéristiques stockées dans la base de composant.

Connecter à un composant : permet de connecter le composant à un composant de la base de composant. Le nom du fichier où le composant se situe est par la suite spécifié à gauche de ce bouton.

Déconnecter un composant : déconnecte le composant de la base de composant.


Identique à : permet de spécifier si le composant est identique à un autre composant de même nature (par exemple un autre capteur dans le cas de l'édition d'un capteur).

En cliquant sur le bouton  il est possible de Recopier les paramètres d'un autre composant.

Cette action permet de recopier les paramètres d'un autre composant de même nature. Cette fonctionnalité n'est accessible que lorsque la SIF comporte plusieurs composants de même nature. Seules la caractéristique Repère, n'est pas recopiée. Les composants disponibles sont les mêmes que ceux présentés pour la fonctionnalité Identique à.


Avertissement
A la différence de l'option Composant existant, le composant n'est pas le même que celui sélectionné, ils sont physiquement distincts mais ils ont les mêmes paramètres. Le composant référence est sélectionnable dans la liste déroulante. Cette fonctionnalité n'est accessible que lorsque la SIF comporte plusieurs composants de même nature. Si la case à cocher est cochée, seul le Repère du composant est éditable (les autres étant identiques au composant référence).

Catégorie d'instrument : correspond à la catégorie utilisé et permet une meilleur classification des capteurs et des actionneurs. Ils sont sélectionnable depuis une liste déroulante ci-dessous. Pour les capteurs :


Pour les actionneurs :



Type d'instrument : correspond au type d'instrument utilisé. Ils sont sélectionnable depuis une liste déroulante. Cette liste est mise à jour régulièrement.

Fabricant : permet de renseigner le nom du fabricant du composant.

Source des données : indique d'où les données de fiabilité sont extraites.

Description : est un champ libre où l'utilisateur peut ajouter sa propre description du composant.


Attention
Dans la base de composants, ces informations sont à renseigner dans les colonnes:

ID

REPERE

DESCRIPTION

INSTRUMENTED_TYPE : l'ensemble des types de composant est donné dans l' Annexe C, Liste des composants

MANUFACTURER

DATA_SOURCE



Caractère déterminé du composant
Caractère déterminé du composant permet de spécifier le caractère déterminé du composant. Le composant est caractérisé par un des trois caractères disponibles.

Non type A/B : indique que le composant est à sécurité négative (à émission) et sans autodiagnostic. Correspond au type NS (Composant non sécurité) des versions antérieures à 2013.

Type B : indique que le composant est à sécurité positive (à manque) ou avec autodiagnostic. Correspond au type S (Composant standard) des versions antérieures à 2013.

Type A : indique que le composant est à sécurité positive (à manque) et éprouvé par l'usage (ou certifié) et avec autodiagnostic (ou avec mise en œuvre de plusieurs tests) et protégé en accès aux réglages internes. Correspond au type F (Composant fiabilisé) des versions antérieures à 2013.


Attention
Dans la base de composants, ces informations sont à renseigner dans la colonne DETERMINED_CHARACTER :

NS pour les composants non type A/B;
S pour les composants de type B;
F pour les composants de type A;


Test
Type de test : permet de spécifier le type de test du composant. Deux types de test sont sélectionnables grâce au menu déroulant :

Test unité à l'arrêt : signifie que le composant est testé lorsque l'unité est à l'arrêt. Le test ne nuit pas à la fonction de sécurité puisque l'unité ne fonctionne plus.

Test unité en marche : signifie que le composant est testé lorsque l'unité est en marche. Le composant n'est plus disponible pour sa fonction et cela influe sur la fonction de sécurité. Par exemple, cela doit être utilisé lorsqu'un capteur est by-passé pour être testé alors que l'installation n'est pas arrêtée.


Note
Il est aussi possible d'indiquer qu'aucun test périodique ne sera effectué sur le composant.

Intervalle entre tests (T1) : correspond à la durée qui sépare deux tests du composant. L'unité de temps est sélectionnable grâce à une liste déroulante ( heures , jours , mois , années ).

Date du premier test (T0) : correspond à la date à laquelle est réalisé le premier test du composant. Les modes d'édition de cette caractéristique (valeur et unité) sont les mêmes que pour l'intervalle entre tests.


Attention
Dans la base de composants, ces informations sont à renseigner dans les colonnes:

TEST_TYPE :

TESTUNITWORK pour Test unité en marche;
TESTUNITSTOP pour Test unité à l'arrêt;
EXP pour Non testé;

T0 : premier test;

T0_UNIT :HOUR, DAY, MONTH ou YEAR;

T1 : intervalle de tests;

T1_UNIT :HOUR, DAY, MONTH ou YEAR.



Paramètres de l'instrument
Cette partie regroupe l'ensemble des données de fiabilité pour un composant.

Pour les taux de défaillance il existe deux manières distinctes de les renseigner:

de manière factorisée en rentrant les paramètres suivant:



Lambda λ : correspond aux taux de défaillances du composant (h-1).

LambdaD/Lambda (λd/λ) : correspond à la proportion de défaillances dangereuses parmi les défaillances totales.

DCd : correspond à la couverture du diagnostic en ligne des pannes dangereuses. C'est un taux compris entre 0 et 100%. Un taux de 0% signifie qu'aucune panne dangereuse ne pourra être détectée.

DCs : correspond à la couverture du diagnostic en ligne des pannes sures. C'est un taux compris entre 0 et 100%. Un taux de 0% signifie qu'aucune panne sure ne pourra être détectée.


Note
Toutes ces valeurs sont éditables manuellement ou sélectionnables à l'aide de la completion automatique dans le cas d'usage de paramètres.

de manière dévelopée en rentrant les paramètres suivant:



Lambda Du (λ du) : correspond au taux de défaillance des pannes non détectées du composant (h-1).

Lambda DD (λ dd) : correspond au taux de défaillance des pannes détectées du composant (h-1).

Lambda SU (λ su) : correspond au taux de défaillance des pannes sures non détectées du composant (h-1).

Lambda SD (λ sd) : correspond au taux de défaillance des pannes sures détectées du composant (h-1).


Note
Toutes ces valeurs sont éditables manuellement ou sélectionnables à l'aide de la completion automatique dans le cas d'usage de paramètres.

SFF (Safe Failure Fraction) en % : correspond au taux de panne sure (λsd + λsu + λdd) / λ
Note
Ce champ n'est pas éditable.
MTTR : correspond au temps moyen entre la détection et la réparation d'un composant (Mean Time To Repair). L'unité de temps est sélectionnable grâce à une liste déroulante ( heures , jours , mois , années ). Cette valeur est éditable manuellement ou sélectionnable à l'aide de la completion automatique.


Note
Ce champ n'est éditable que si DCd ou λ DD sont différents de 0 ou si Type de test est égale à Test unité en marche .

Défaillance due au test γ (Gamma) : correspond à la probabilité [0,1] que le test engendre une défaillance du matériel. La valeur 0 signifiera que les tests ne provoquent pas de défaillance. La valeur 1 signifiera que tous les tests effectués provoqueront une défaillance. Cette valeur est éditable manuellement ou sélectionnable à l'aide de la completion automatique.


Note
Ce champ n'est éditable que si DC est différent de 0 ou si Type de test est différent de Non testé .


Attention
Dans la base de composants, ces informations sont à renseigner dans les colonnes:

MODE : DEVELOPED ou FACTORISED

LAMBDA ;

DFF ;

DC_D ;

DC_S ;

LAMBDA_DU ;

LAMBDA_DD ;

LAMBDA_SU ;

LAMBDA_SD ;

MTTR ;

MTTR_UNIT : HOUR, DAY, MONTH ou YEAR;

GAMMA .




Avertissement
Les actionneurs secondaires ne possèdent pas de caractéristique Caractère déterminé du composant. La partie relative à cette caractéristique n'est donc pas présente lors de leur paramétrage. Par convention, l'actionneur secondaire a le même caractère déterminé que celui défini dans son actionneur principal.



Il est possible de spécifier les paramètres plus spécifiques d'un actionneur (principal ou secondaire) en renseignant la partie Paramètres avancés.




Les paramètres avancés de l'actionneur sont les suivants :


La réparation des pannes sures n'affecte pas la fonction de sécurité : si la case est cochée la réparation des pannes sures n'a pas d'impact sur la fonction de sécurité.




Composant disponible durant le test (X) : spécifie si le composant peut assurer sa mission de sécurité durant le test (si la case est cochée).

Lambda durant le test λ* : correspond au taux de défaillances du composant durant le test du matériel (h-1). Il se peut que les conditions de test provoquent un stress supplémentaire et augmentent le lambda. Il est possible d'indiquer que la valeur soit égale à celle du lambda (λ du).

Durée du test π (Pi) : correspond à la durée nécessaire au test du composant. L'unité de temps est sélectionnable grâce à une liste déroulante (heures, jours, mois, années).


Note
Ce champ n'est éditable que si Type de test est égale à Test unité en marche.

Efficacité du test σ (Sigma) : correspond au taux de couverture ou d'efficacité du test. Cette valeur est comprise entre 0 (le test ne détecte jamais rien) et 1 (le test détecte toujours la panne).

Oubli de reconfiguration après test ω1 (Omega1) : correspond à la probabilité [0,1] d'oubli de reconfiguration du matériel après le test. Il s'agit de la probabilité que l'opérateur ne remette pas le composant dans l'état d'assurer sa mission de sécurité après le test. On peut la laisser à 0 si on estime que les opérateurs et les procédures de tests sont infaillibles (pas d'oubli du "by-pass" sur un capteur, remise du moteur sous tension, ...).

Oubli de reconfiguration après réparationω2 (Omega2) : correspond à la probabilité [0,1] d'oubli de reconfiguration du matériel après la réparation (ou changement). Il s'agit de la probabilité que l'opérateur ne remette pas le composant dans l'état d'assurer sa mission de sécurité après la réparation. On peut la laisser à 0 si on estime que les opérateurs et les procédures de réparation sont infaillibles (moteur neuf sous tension, ...).

Couverture du test d'épreuve : permet de spécifier si le composant est testé sur toutes ses défaillances, ou si le composant n'est testé que sur une partie de ses défaillances. Si un composant est testé sur toutes ses défaillances, alors la couverture du test d'épreuve est de 100% (valeur par défaut). Si qu'une partie du composant est testé, alors il est possible de spécifier le pourcentage de cette couverture.

Durée de vie du composant: précise si le composant sera remplacé une fois que sa durée de vie est terminée pour être remis à neuf. Ce paramètre est lié à la Couverture du test d'épreuve : la où ce dernier précise à quel pourcentage le composant va être réparé (et donc à quel pourcentage le PFD revient à 0), la durée de vie du composant permet de remettre le PFD du composant à 0. Il n'a donc pas d'intérêt si la Couverture du test d'épreuve est à 100%. La Durée de vie du composant doit être un multiple de la Couverture de test d'épreuve. L'efficacité du test σ, l'oublie de reconfiguration après testω1, et l'oubli de reconfiguration après réparation ω2 sont aussi pris en compte lors du remplacement par un nouveau composant. Un champ vide indique que le composant ne sera pas remplacé sur la durée des années d'exploitation.

HFT précise quel est le HFT propre au composant. Il est possible qu'un composant ne soit modélisé que par un seul composant virtuel dans le modèle, mais qu'en réalité, il représente deux ou plus composant matériel. Dans ce cas-la, il est possible de renseigner un HFT spécifique au composant, pour préciser qu'il s'agit en réalité de plusieurs composants. Par défaut, la valeur d'un HFT est 0 : si un composant virtuel représente deux composants matériel, alors son HFT est de 1.




Attention
Dans la base de composants, ces informations sont à renseigner dans les colonnes:

X : FALSE ou TRUE;

LAMBDASTAR;

LAMBDASTAR_EQUALTO_LAMBDA : FALSE ou TRUE;

PI

PI_UNIT :HOUR, DAY, MONTH ou YEAR;

SIGMA;

OMEGA1;

OMEGA2.

PROOF_TEST_COVERAGE.

LIFETIME

LIFETIME_UNIT:HOUR, DAY, MONTH or YEAR;

HFT





Test de course partielle : si cette option est cochée, on effectue sur celui ci des tests de course partielle. Par exemple une vanne équipée d'un test de course partielle de son opercule.

Rappel important sur les pannes dangereuses non détectées : Les pannes dangereuses non détectées sont des pannes que le diagnostic en ligne ne détecte pas, la détection ne peux se faire que lors des tests "complet" du composant lors des test d'épreuve (proof test). Cependant, lors des tests partiels, cette part de pannes peut être détectée.


Nous avons donc la décomposition suivante de ces pannes lors de ces tests partiels :


- une part de panne "Dangereuse Non Détectée" détectées par les tests partiels entre deux tests complets. Cette part dépend de la couverture du test partiel et est modélisée à l'aide d'une loi test périodique complète à 11 paramètres.