D.1 Généralités
D.1.1 Introduction
La présente norme inclut un certain nombre de mesures ayant trait aux défaillances
systématiques. Toutefois, quelle que soit la qualité d'application de ces mesures, il existe
une probabilité résiduelle d'apparition de défaillances systématiques. Bien que cela n’affecte
pas de manière significative les calculs de fiabilité pour les systèmes à un canal unique, le
potentiel de défaillance pouvant affecter plus d'un canal sur des systèmes à plusieurs canaux
(ou plusieurs composants dans un système de sécurité redondant), c'est-à-dire des
défaillances de cause commune, se traduit en erreurs substantielles lorsque des calculs de
fiabilité sont appliqués à des systèmes à plusieurs canaux ou redondants.
Cette annexe informative décrit deux méthodologies qui permettent de prendre en compte les
défaillances de cause commune dans l'évaluation de sécurité des systèmes E/E/PE à
plusieurs canaux ou redondants. L'utilisation de ces méthodologies permet d'estimer
l'intégrité d'un tel système de manière plus précise que si les défaillances de cause
commune potentielles sont ignorées.
La première méthodologie est utilisée pour calculer une valeur de β, facteur fréquemment
utilisé dans la modélisation des défaillances de cause commune. Ceci permet d’estimer le
taux de défaillances de cause commune applicable à deux systèmes ou plus fonctionnant en
parallèle à partir du taux de défaillance aléatoire du matériel de l’un de ces systèmes (voir
D.5). Il est généralement admis que les chiffres relatifs aux défaillances aléatoires du
matériel incluent un nombre de défaillances occasionnées par des défaillances
systématiques.
D'autres méthodologies sont dans certains cas préférables, par exemple lorsqu'un facteur β
plus précis peut être obtenu grâce à la disponibilité de données relatives aux défaillances de
cause commune ou lorsque le nombre d’éléments affectés est supérieur à quatre. La
deuxième méthodologie, c’est-à-dire la méthode du taux de défaillance binomiale (également
désignée modèle des chocs), peut être utilisée.
D.1.2 Présentation succincte
On considère que les défaillances d'un système ont deux causes différentes:
– les défaillances aléatoires du matériel; et
– les défaillances systématiques.
On estime que les premières apparaissent de manière aléatoire dans le temps pour tout
composant et entraînent une défaillance d'un canal au sein du système auquel appartient le
composant lorsque les dernières apparaissent immédiatement et de manière déterministe
lorsque le système atteint l’état auquel l’erreur systématique sous-jacente s’applique.
Il existe une probabilité restreinte que des défaillances aléatoires indépendantes du matériel
puissent avoir lieu sur tous les canaux d'un système à plusieurs canaux de sorte que tous les
canaux présentent simultanément un état de défaillance. Les défaillances aléatoires du
matériel étant sensées apparaître au hasard dans le temps, la probabilité pour que de telles
défaillances affectent simultanément des canaux parallèles est faible comparée à la probabilité de défaillance d'un seul canal. Cette probabilité peut être calculée au moyen de
techniques communément admises mais le résultat peut être très optimiste lorsque les
défaillances ne sont pas totalement indépendantes les unes des autres.
Les défaillances dépendantes se décomposent traditionnellement dans les catégories
suivantes (voir la référence [18] dans la Bibliographie):
− Défaillance de cause commune (CCF) provoquant plusieurs défaillances à partir d’une
cause partagée unique. Les défaillances multiples peuvent se produire simultanément ou
sur une période de temps;
− Défaillances de mode commun (CMF) qui représentent un cas particulier de CCF dans
lequel plusieurs équipements sont défaillants dans le même mode;
− Défaillances en cascade qui sont des défaillances par propagation.
Le terme CCF est souvent utilisé pour couvrir tous les types de défaillances dépendantes
comme appliqué dans la présente annexe. Elles se décomposent également comme suit:
− Défaillances dépendantes dues à des causes déterministes évidentes;
− Evénements de défaillances multiples potentielles résiduelles non pris explicitement en
compte dans l’analyse du fait du manque d’exactitude, de causes déterministes pas
évidentes ou de l’impossibilité de collecter des données de fiabilité.
Il convient d’analyser, de modéliser et de quantifier la première défaillance de manière
conventionnelle et de traiter uniquement la deuxième comme indiqué dans la présente
Annexe D informative. Cependant, les défaillances systématiques – qui sont des défaillances
parfaitement dépendantes non identifiées pendant l’analyse de sécurité (sinon elles auraient
été retirées) – sont traitées de manière spécifique dans la présente norme et cette annexe
s’applique principalement aux défaillances dépendantes aléatoires du matériel.
Par conséquent, les défaillances de cause commune résultant d'une cause unique peuvent
affecter plusieurs canaux ou plusieurs composants. Celles-ci peuvent avoir pour origine une
défaillance systématique (par exemple, une erreur de conception ou de spécification) ou une
contrainte extérieure provoquant une défaillance aléatoire précoce du matériel (par exemple
une température excessive résultant de la défaillance aléatoire d'un ventilateur de
refroidissement commun, qui accélère la durée de vie des composants ou les sort de leur
environnement d'exploitation spécifié) ou, éventuellement, une combinaison des deux. Les
défaillances de cause commune étant, selon toute vraisemblance, susceptibles d'affecter
plusieurs canaux dans un système à plusieurs canaux, la probabilité de défaillance de cause
commune est probablement le facteur déterminant d'évaluation de la probabilité globale de
défaillance d'un système à plusieurs canaux et si cela n’est pas pris en compte, il est peu
probable d’obtenir une estimation réaliste du niveau d'intégrité de sécurité du système à
plusieurs canaux.
D.1.3 Protection contre les défaillances de cause commune
Bien que les défaillances de cause commune résultent d'une cause unique, elles ne se
manifestent pas toutes simultanément dans tous les canaux. Par exemple, si un ventilateur
est défectueux, tous les canaux d'un système E/E/PE à plusieurs canaux peuvent subir une
défaillance, et entraîner aussi une défaillance de cause commune. Cependant, il est peu
probable que tous les canaux s'échauffent avec la même intensité ou atteignent la même
température critique. Les défaillances apparaissent donc à des moments différents dans les
différents canaux.
L'architecture des systèmes programmables leur permet d'exécuter des fonctions de
diagnostic interne pendant leur exploitation en ligne. Celles-ci peuvent être utilisées de
diverses manières, par exemple
– un système électronique programmable à un canal peut vérifier en continu son
fonctionnement interne ainsi que la fonctionnalité des dispositifs d'entrée et de sortie.

Lorsqu'elle a été prévue dès la conception, une couverture d’essai de l'ordre de 99 % est
réalisable (voir [13] dans la Bibliographie). Si 99 % des anomalies internes sont détectées
avant qu'elles ne provoquent une défaillance, la probabilité d'anomalies sur un seul canal
qui peut en définitive contribuer à des défaillances de cause commune est réduite de
manière significative;
– outre les essais internes, chaque canal d'un système électronique programmable peut
surveiller les sorties d'autres canaux dans un système électronique programmable à
plusieurs canaux (ou encore chaque dispositif électronique programmable peut surveiller
un autre dispositif de même nature dans un système électronique programmable à
plusieurs canaux). De cette manière, lorsqu'une défaillance apparaît sur un canal, elle
peut être détectée, puis un arrêt de sécurité peut être déclenché par le ou les canaux
restants qui n'ont pas subi de défaillance et qui effectuent l’essai de surveillance croisée.
(Il convient de noter que la surveillance croisée n'est efficace que si l'état du système de
commande change en continu, par exemple le verrouillage d'une protection fréquemment
utilisée dans une machine cyclique, ou lorsque de brefs changements peuvent être
introduits sans affecter la fonction commandée.) Cette surveillance croisée peut être
exécutée à un débit élevé, de sorte que, juste avant une défaillance de cause commune
non simultanée, il est probable qu’un essai de surveillance croisée détecte la défaillance
du premier canal et soit en mesure de mettre le système en état de sécurité avant qu'un
second canal ne soit affecté.
Si l'on reprend l'exemple du ventilateur, le taux d'élévation de la température et la sensibilité
de chaque canal sont légèrement différents, entraînant une éventuelle défaillance du second
canal plusieurs dizaines de minutes après le premier. Cela permet à l’essai de diagnostic de
lancer un arrêt de sécurité avant que le second canal ne succombe à l'anomalie de cause
commune.
On peut donc en conclure que
– les systèmes électroniques programmables ont la possibilité d'incorporer des défenses
contre les défaillances de cause commune et être ainsi moins sensibles à ces
défaillances en comparaison à d'autres technologies;
– un facteur β différent peut être applicable aux systèmes électroniques programmables par
comparaison avec d'autres technologies. Ainsi, les estimations réalisées sur le facteur β
et fondées sur des données historiques sont susceptibles de ne pas être valides. (Aucun
des modèles existants étudiés utilisés pour l'estimation de la probabilité de défaillance de
cause commune ne prévoit l'effet de la surveillance croisée automatique);
– étant donné que les défaillances de cause commune sont étalées dans le temps, et
peuvent être révélées par les essais de diagnostic avant qu'elles n'affectent tous les
canaux, de telles défaillances peuvent ne pas être reconnues ou indiquées comme étant
des défaillances de cause commune.
Trois approches peuvent être suivies pour réduire la probabilité des défaillances de cause
commune potentiellement dangereuses.
a) Réduire le nombre global de défaillances systématiques et défaillances aléatoires du
matériel. (Cela réduit les surfaces des ellipses dans la Figure D.1, entraînant ainsi une
réduction de la zone de chevauchement).
b) Assurer une indépendance maximale des canaux (séparation et diversité). (Cela réduit la
zone de chevauchement entre les ellipses dans la Figure D.1 tout en conservant la même
surface.)
c) Détecter les défaillances de cause commune non simultanées lorsqu'un seul canal est
affecté et avant qu'un deuxième ne le soit, c'est-à-dire utiliser les essais de diagnostic ou
le décalage des essais périodiques.

Défaillances
du canal 2
Défaillances de
cause commune
affectant les deux
canaux
CEI 336/2000
Défaillances
du canal 1
Figure D.1 – Relation entre défaillances de cause commune
et défaillances propres à un canal
Pour les systèmes à plus de deux canaux, la défaillance de cause commune peut affecter
tous les canaux ou uniquement plusieurs canaux sans toutefois dépendre de la source de
mode commun. Ainsi, l’approche retenue dans la présente annexe, selon la première
méthode, consiste à calculer la valeur β sur la base d’un système duplex à logique
majoritaire 1oo2, puis à appliquer un facteur de multiplication à la valeur calculée β en
fonction du nombre total de canaux et des exigences de logique majoritaire. (voir Tableau
D.5).
D.1.4 Approche adoptée dans la série CEI 61508
La série CEI 61508 se fonde sur ces trois orientations et nécessite donc une triple approche:
a) Appliquer les techniques spécifiées dans la CEI 61508-2/3 afin de réduire la probabilité
globale de défaillance systématique à un niveau correspondant à la probabilité de
défaillance aléatoire du matériel.
b) Quantifier les facteurs qui peuvent l'être, en d'autres termes tenir compte de la probabilité
de défaillance aléatoire du matériel, comme spécifié dans la CEI 61508-2.
c) Déduire, en utilisant les moyens considérés comme les plus adéquats à l'heure actuelle,
un facteur reliant la probabilité de défaillance de cause commune du matériel à la
probabilité de défaillances aléatoires du matériel. La méthodologie décrite dans la
présente annexe traite de l’obtention de ce facteur.
La plupart des méthodologies permettant d'estimer la probabilité de défaillances de cause
commune tentent de faire des prédictions à partir de la probabilité de défaillances aléatoires
du matériel. Il est difficile de justifier une relation entre ces probabilités; toutefois, une telle
corrélation a été vérifiée dans la pratique et procède probablement d'effets de second ordre.
Par exemple, plus la probabilité de défaillances aléatoires du matériel d'un système est
élevée,
– plus le volume de la maintenance exigé par le système est important. La probabilité
d'introduction d'une anomalie systématique au cours de la maintenance dépend du
nombre d'opérations de maintenance réalisé, et cela affecte également le taux d'erreurs
humaines, ce qui entraîne des défaillances de cause commune. Cela donne lieu à une
relation entre la probabilité de défaillances aléatoires du matériel et la probabilité de
défaillance de cause commune. Par exemple:

– 95 – EN 61508-6:2010
• une réparation, suivie d’essais et éventuellement d'un réétalonnage, est nécessaire à
chaque fois qu'une défaillance aléatoire du matériel a lieu;
• pour un niveau d'intégrité de sécurité donné, un système ayant une probabilité de
défaillances aléatoires du matériel plus élevée nécessite des essais périodiques plus
fréquents et plus approfondis/complexes, entraînant une intervention humaine
supplémentaire.
– plus complexe est le système. La probabilité de défaillances aléatoires du matériel
dépend du nombre de composants, et donc de la complexité d'un système. Un système
complexe est plus difficilement compris et donc plus vulnérable à l'introduction
d'anomalies systématiques. De plus, la complexité rend difficile la détection des
anomalies, que ce soit par une analyse ou des essais, et peut alors utiliser des parties de
la logique d'un système peu éprouvées dans la pratique, si ce n'est en de rares
circonstances. A nouveau, cela entraîne une relation entre la probabilité de défaillances
aléatoires du matériel et la probabilité de défaillance de cause commune.
Plusieurs approches sont couramment utilisées pour traiter les CCF (facteur β, lettres
grecques multiples, facteur α, taux de défaillance binomiale ...) [20]. La présente annexe
informative propose deux des modèles courants pour la troisième partie de la triple approche
déjà décrite. Malgré les limites des modèles courants, ils sont reconnus comme étant à
l'heure actuelle les meilleurs moyens de fournir une estimation de la probabilité de
défaillance de cause commune:
− le modèle bien établi du facteur β qui est largement utilisé et constitue un moyen réaliste
de traiter un système à plusieurs canaux, comportant généralement jusqu’à quatre
éléments dépendants.
− le taux de défaillance binomiale [21] (également désigné modèle des chocs) qui peut être
utilisé lorsque le nombre d’éléments dépendants est supérieur à quatre.
On se heurte aux deux difficultés suivantes lorsque l'on utilise le facteur β ou les modèles
des chocs sur un système E/E/PE.
– Quelle valeur convient-il de choisir pour les paramètres? De nombreuses sources (par
exemple la référence [10]) suggèrent des fourchettes probables de la valeur du facteur β
mais aucune valeur réelle n'est donnée, et le choix est laissé à l'appréciation subjective
de l'utilisateur. Pour résoudre ce problème, la méthodologie du facteur β de la présente
annexe se fonde sur le système décrit en premier lieu dans la référence [11] et
récemment redéfinie dans la référence [12].
– Ni le modèle du facteur β ni le modèle des chocs ne tiennent compte des capacités
d’essai de diagnostic sophistiquées des systèmes électroniques programmables
modernes, qui peuvent être utilisées pour la détection de défaillances de cause commune
non simultanées avant qu'elles n'aient eu suffisamment de temps pour se manifester
pleinement. Pour combler cette lacune, l'approche décrite dans les références [11] et [12]
a été modifiée afin de refléter l'effet des essais de diagnostic sur l'estimation de la valeur
probable de β.
Les fonctions d’essai de diagnostic d'un système électronique programmable effectuent
continuellement une comparaison entre le fonctionnement du système et des états prédéfinis.
Ces états peuvent être prédéfinis sur logiciel ou sur matériel (par exemple au moyen d'un
chien de garde). Envisagées ainsi, les fonctions d’essai de diagnostic peuvent être
considérées comme un canal supplémentaire assurant partiellement une certaine diversité et
tournant parallèlement au système électronique programmable.
Une surveillance croisée entre les canaux peut également être réalisée. Cette technique a
été utilisée pendant de nombreuses années dans des systèmes à deux canaux
interverrouillés uniquement à base de relais. Cependant, avec une technologie à relais, il
n'est généralement possible de réaliser des vérifications croisées que lorsque les canaux
changent d'état, rendant ces essais inadaptés pour la détection de défaillances de cause
commune non simultanées dans lesquelles les systèmes restent dans le même état (par
exemple ON) sur de longues périodes. Avec la technologie des systèmes électroniques

programmables, la surveillance croisée peut être réalisée à une fréquence de répétition
élevée.
D.2 Domaine d'application de la méthodologie
Le domaine d'application de cette méthodologie se limite aux défaillances de cause
commune dans le matériel et ce, pour les raisons suivantes:
– le modèle du facteur β et le modèle des chocs relient la probabilité de défaillance de
cause commune à la probabilité de défaillance aléatoire du matériel. La probabilité de
défaillances de cause commune qui implique le système dans son ensemble dépend de la
complexité du système (qui s'explique éventuellement par le logiciel de l'utilisateur) et
non du matériel uniquement. Tout calcul fondé sur la probabilité de défaillance aléatoire
du matériel ne peut manifestement pas prendre en compte la complexité du logiciel;
– les comptes rendus sur les défaillances de cause commune se limitent généralement aux
défaillances du matériel, le domaine le plus préoccupant pour les fabricants du matériel;
– la modélisation des défaillances systématiques (par exemple les défaillances de logiciel)
n'est pas considérée comme réalisable dans la pratique;
– les mesures spécifiées dans la CEI 61508-3 sont destinées à réduire la probabilité de
défaillance de cause commune liée au logiciel à un niveau acceptable compte tenu du
niveau d'intégrité de sécurité cible.
Ainsi, l'estimation de la probabilité de défaillance de cause commune issue de cette
méthodologie est liée uniquement aux défaillances relatives au matériel. Il convient de NE
PAS considérer que cette méthodologie puisse être utilisée pour obtenir un taux de
défaillance global prenant en compte la probabilité de défaillance relative au logiciel.
D.3 Éléments pris en compte dans la méthodologie
Dans la mesure où les capteurs, les sous-systèmes logiques et éléments finaux sont sujets,
par exemple, à des conditions environnementales différentes et des essais de diagnostic
ayant des niveaux de capacité variables, il convient que la méthodologie soit appliquée à
chacun des sous-systèmes séparément. Par exemple, le sous-système logique est plus
vraisemblablement destiné à un environnement contrôlé, alors que les capteurs peuvent être
montés à l'extérieur sur une tuyauterie exposée aux intempéries.
Les canaux électroniques programmables ont la capacité requise pour exécuter des fonctions
d’essai de diagnostic sophistiquées. Ces fonctions peuvent
– disposer d'une couverture de diagnostic élevée au sein des canaux;
– surveiller des canaux de redondance supplémentaires;
– avoir une fréquence de répétition élevée; et
– dans certains cas de plus en plus nombreux, surveiller également des capteurs et/ou des
éléments finaux.
Pour une grande part, les défaillances de cause commune n'affectent pas en même temps
tous les canaux. Ainsi, lorsque la fréquence de répétition des essais de diagnostic est
suffisamment élevée, une grande partie de défaillances de cause commune peut être
détectée et donc être évitée avant d'affecter tous les canaux disponibles.
Les caractéristiques d'un système à plusieurs canaux, qui ont une incidence sur son
immunité aux défaillances de cause commune, ne peuvent pas être toutes évaluées par les
essais de diagnostic. Cependant, les caractéristiques ayant trait à la diversité ou à
l'indépendance sont rendues plus effectives. Toute caractéristique destinée à prolonger la
durée entre défaillances de canal pour une défaillance de cause commune non simultanée
(ou réduire la proportion de défaillances de cause commune simultanées) augmente la

probabilité de détection de la défaillance par les essais de diagnostic et de mise en sécurité
du site. Les caractéristiques liées à l'immunité aux défaillances de cause commune sont donc
divisées entre celles dont l'effet est supposé être accru par l'utilisation des essais de
diagnostic et celles dont l'effet n'est pas supposé être accru. Cela conduit aux deux
colonnes, respectivement X et Y, du Tableau D.1.
Toutefois, pour un système à trois canaux, la probabilité que des défaillances de cause
commune affectent les trois canaux est légèrement inférieure à la probabilité de défaillances
affectant deux canaux; on suppose, pour simplifier la méthodologie du facteur β, que la
probabilité est indépendante du nombre de canaux affectés; en d’autres termes, on suppose
que lorsqu'une défaillance de cause commune se produit, elle affecte tous les canaux. Une
autre méthode est le modèle des chocs.
Il n'existe pas de données disponibles connues sur les défaillances de cause commune
relatives au matériel permettant l'étalonnage de la méthodologie. Les tableaux de la présente
annexe ont donc été élaborés à partir d'un raisonnement théorique.
Parfois, les programmes d’essai de diagnostic ne jouent pas un rôle direct de sécurité et
peuvent donc ne pas faire l'objet du même niveau de garantie de qualité que ceux qui
assurent les principales fonctions de commande. Cette méthodologie a été développée en se
fondant sur l'hypothèse selon laquelle les essais de diagnostic possèdent une intégrité qui
correspond au niveau d'intégrité de sécurité cible. Il convient donc de développer tout
programme d’essai de diagnostic lié au logiciel en utilisant des techniques adaptées au
niveau d'intégrité de sécurité cible.
D.4 Utilisation du facteur β pour le calcul de probabilité de défaillance due à
des défaillances de cause commune dans un système E/E/PE relatif à la
sécurité
Considérons l'effet de défaillances de cause commune sur un système à plusieurs canaux
disposant d’essais de diagnostic dans chacun de ses canaux.
Si l'on utilise le modèle du facteur β, le taux de défaillance dangereuse de cause commune
est:
λDβ
où
λD est le taux de défaillance dangereuse aléatoire du matériel pour chaque canal individuel
et β est le facteur β en l'absence d’essais de diagnostic, c'est-à-dire la proportion de
défaillances d'un canal individuel qui affectent tous les canaux.
Supposons maintenant que les défaillances de cause commune affectent tous les canaux et
que la période de temps entre la défaillance sur le premier canal et la défaillance de tous les
canaux est relativement courte en comparaison de l'intervalle de temps entre des
défaillances de cause commune successives.
Supposons qu'il existe des essais de diagnostic exécutés dans chaque canal que détecte et
révèle une partie des défaillances. On peut répartir toutes les défaillances dans deux
catégories: celles qui ne s'inscrivent pas dans la couverture des essais de diagnostic (et qui
ne peuvent donc jamais être détectées) et celles qui s'inscrivent dans cette couverture (qui
sont en fin de compte détectées par les essais de diagnostic).
Le taux global de défaillance provoqué par des défaillances dangereuses de cause commune
est donc donné par:

λDUβ + λDD D β
où
– λDU est le taux de défaillance dangereuse non détectée d'un canal unique, c'est-à-dire le
taux de défaillance des défaillances qui ne s'inscrivent pas dans la couverture des essais
de diagnostic; toute réduction dans le facteur β induite par la fréquence de répétition des
essais de diagnostic n’affecte manifestement pas cette proportion des défaillances;
– β est le facteur de défaillance de cause commune pour les anomalies dangereuses non
détectables, égal au facteur β global applicable en l’absence d’essai de diagnostic;
– λDD est le taux de défaillance dangereuse détectée d'un canal unique, c'est-à-dire le taux
de défaillance des défaillances d'un seul canal qui s'inscrivent dans la couverture des
essais de diagnostic. Si la fréquence de répétition des essais de diagnostic est élevée,
une proportion des défaillances est découverte, entraînant ainsi une réduction de la
valeur de β, c'est-à-dire βD;
– βD est le facteur de défaillance de cause commune pour les anomalies dangereuses
détectables. Plus la fréquence de répétition des essais de diagnostic est augmentée, plus
la valeur de βD descend en dessous de celle de β;
– β est obtenu à partir du Tableau D.5, en utilisant les résultats de D.4 tel que, S = X + Y
(voir D.5);
– βD est obtenu à partir du Tableau D.5, en utilisant les résultats de D.4 tel
que, SD = X() Z +1 Y + .
D.5 Utilisation des tableaux pour l'estimation de β
Il convient de calculer séparément le facteur β pour les capteurs, le sous-système logique et
les éléments finaux.
Afin de réduire au minimum la probabilité d'occurrence de défaillances de cause commune, il
convient d’établir en premier lieu les mesures qui permettent une défense efficace contre
l'apparition de ces défaillances. La mise en oeuvre des mesures appropriées dans le
système entraîne une réduction de la valeur du facteur β utilisée pour l'estimation de la
probabilité de défaillance due à des défaillances de cause commune.
Le Tableau D.1 énumère les mesures et comprend des valeurs associées, basées sur une
approche théorique (estimation d’ingénierie), qui représentent la contribution de chacune des
mesures à la réduction des défaillances de cause commune. Les capteurs et éléments finaux
étant traités différemment des composants électroniques programmables, des colonnes
distinctes sont utilisées dans le tableau pour énumérer ces composants ainsi que les
capteurs ou éléments finaux.
Des essais de diagnostic étendus peuvent être inclus dans des systèmes électroniques
programmables pour détecter des défaillances de cause commune non simultanées. Pour
pouvoir prendre en compte les essais de diagnostic dans l'estimation du facteur β, la
contribution globale de chaque mesure du Tableau D.1 est répartie, en utilisant une approche
théorique, entre deux ensembles de valeurs, X et Y. Pour chaque mesure, le ratio X:Y
représente l’importance de l’amélioration de la contribution de cette mesure à l’élimination
des défaillances de cause commune par les essais de diagnostic.
Il convient que l'utilisateur du Tableau D.1 détermine les mesures applicables au système en
question, et fasse la somme des valeurs correspondantes indiquées dans chacune des
colonnes XLS et YLS pour le sous-système logique, ou XSF et YSF pour les capteurs ou
éléments finaux, les sommes étant respectivement notées X et Y.
Il est admis d'utiliser les Tableaux D.2 et D.3 pour déterminer un facteur Z à partir de la
fréquence et de la couverture des essais de diagnostic, en tenant compte de la Note 4

(importante) qui limite les cas où il convient d’utiliser une valeur non nulle de Z. Le résultat S
est alors calculé en utilisant les équations suivantes, selon le cas (voir l'article précédent):
– S = X + Y pour obtenir la valeur de βint (facteur β pour les défaillances non détectées); et
– SD = X() Z +1 Y + pour obtenir la valeur de βD int (facteur β pour les défaillances
détectées).
Ici, S ou SD est le résultat utilisé dans le Tableau D.4 pour déterminer le facteur β int
approprié.
βint et βD int représentent les valeurs de la défaillance de cause commune avant de tenir
compte de l’effet de différents degrés de redondance.

TABLEAU D1 :
# Tableau D.1 – Calcul des résultats électroniques programmables ou des capteurs/éléments finaux

| Article | XLS | YLS | XSF | YSF |
|---|---|---|---|---|

## Séparation / ségrégation

| Tous les câbles de signaux des canaux sont-ils acheminés séparément vers tous les points de connexion ? | 1.5 | 1.5 | 1.0 | 2.0 |
| Les canaux du sous-système logique sont-ils sur des cartes de circuits imprimés séparées ? | 3.0 | 1.0 |  |  |
| Les canaux du sous-système logique sont-ils séparés efficacement (par exemple dans des armoires séparées) ? | 2.5 | 0.5 |  |  |
| Si les capteurs/éléments finaux disposent d'une électronique de commande dédiée, l'électronique de chaque canal est-elle sur une carte de circuit imprimé séparée ? |  |  | 2.5 | 1.5 |
| Si les capteurs/éléments finaux disposent d'une électronique de commande, l'électronique de chaque canal est-elle sous abri et dans des armoires séparées ? |  |  | 2.5 | 0.5 |

## Diversité / redondance

| Les canaux emploient-ils des technologies électriques différentes (ex : un canal électronique ou programmable et l'autre à relais) ? | 8.0 |  |  |  |
| Les canaux emploient-ils des technologies électroniques différentes (ex : un canal électronique et l'autre programmable) ? | 6.0 |  |  |  |
| Les dispositifs emploient-ils des principes physiques différents pour les éléments sensibles (pression vs température, etc.) ? |  |  | 9.0 |  |
| Les dispositifs utilisent-ils des principes électriques/conceptions différents (numérique vs analogique, fabricant différent, etc.) ? |  |  | 6.5 |  |
| Une faible diversité est-elle utilisée (ex : essais de diagnostic utilisant la même technologie) ? | 2.0 | 1.0 |  |  |
| Une diversité moyenne est-elle utilisée (ex : essais de diagnostic utilisant une technologie différente) ? | 3.0 | 2.0 |  |  |
| Les canaux ont-ils été conçus par des concepteurs différents sans communication pendant la conception ? | 1.5 | 1.5 |  |  |
| Des méthodes d’essai et des individus différents sont-ils utilisés pour chaque canal pendant la mise en service ? | 1.0 | 0.5 | 1.0 | 2.0 |
| La maintenance de chaque canal est-elle réalisée par des personnes différentes à des moments différents ? | 3.0 | 3.0 |  |  |

## Complexité / conception / application / maturité / expérience

| L'interconnexion entre des canaux prévient-elle l'échange d'informations autres que pour diagnostic ou logique majoritaire ? | 0.5 | 0.5 | 0.5 | 0.5 |
| La conception se fonde-t-elle sur des techniques utilisées avec succès dans ce domaine depuis plus de 5 ans ? | 0.5 | 1.0 | 1.0 | 1.0 |
| Y a-t-il plus de 5 ans d'expérience avec le même matériel dans des environnements similaires ? | 1.0 | 1.5 | 1.5 | 1.5 |
| Le système est-il simple (ex : pas plus de 10 entrées ou sorties par canal) ? | 1.0 |  |  |  |
| Les entrées et sorties sont-elles protégées contre surtensions et surintensités ? | 1.5 | 0.5 | 1.5 | 0.5 |
| Les caractéristiques assignées de tous les dispositifs/composants sont-elles sélectionnées avec prudence (facteur ≥2) ? | 2.0 |  | 2.0 |  |

## Évaluation / analyse et retour d'information

| Les analyses FMEA / FTA ont-elles été examinées pour identifier et éliminer les causes communes dès la conception ? |  |  | 3.0 | 3.0 |
| Les défaillances de cause commune ont-elles été prises en compte dans la conception avec preuves documentaires ? |  |  | 3.0 | 3.0 |
| Toutes les défaillances terrain sont-elles analysées avec retour d'expérience vers la conception ? | 0.5 | 3.5 | 0.5 | 3.5 |

TABLEAU D1 SUITE :
| Article | XLS | YLS | XSF | YSF |
|---|---|---|---|---|

## Procédures / interface humaine

| Existe-t-il une procédure de travail écrite qui assure que toutes les défaillances (ou dégradations) de composants sont détectées, que les causes initiales sont établies et d'autres éléments similaires inspectés pour déceler les causes potentielles de défaillances similaires ? |  | 1.5 | 0.5 | 1.5 |
| Existe-t-il des procédures garantissant que : la maintenance (y compris le réglage ou l'étalonnage) de toute partie des canaux indépendants est échelonnée et, outre les vérifications manuelles réalisées après la maintenance, les essais de diagnostic peuvent-ils être exécutés de manière satisfaisante entre l'achèvement de la maintenance d'un canal donné et le début de la maintenance d'un autre canal ? | 1.5 | 0.5 | 2.0 | 1.0 |
| Les procédures écrites de maintenance spécifient-elles que toutes les parties de systèmes redondants (par exemple des câbles, etc.), conçus pour être indépendants les uns des autres, ne sont pas allouées de façons différentes ? | 0.5 | 0.5 | 0.5 | 0.5 |
| La maintenance des cartes de circuits imprimés, etc. est-elle effectuée à l'extérieur par un centre de réparation qualifié et tous les éléments réparés sont-ils soumis à des essais de préinstallation complets ? | 0.5 | 1.0 | 0.5 | 1.5 |
| Le système a-t-il une couverture de diagnostic faible (60 % à 90 %) et rend-il compte des défaillances au niveau d'un module remplaçable sur site ? | 0.5 |  |  |  |
| Le système a-t-il une couverture de diagnostic moyenne (90 % à 99 %) et rend-il compte des défaillances au niveau d'un module remplaçable sur site ? | 1.5 | 1.0 |  |  |
| Le système a-t-il une couverture de diagnostic élevée (> 99 %) et rend-il compte des défaillances au niveau d'un module remplaçable sur site ? | 2.5 | 1.5 |  |  |
| Les essais de diagnostic du système rapportent-ils les défaillances au niveau d'un module remplaçable sur site ? |  |  | 1.0 | 1.0 |

## Compétence / formation / culture de sécurité

| Les concepteurs ont-ils été formés (sur la base d'une documentation de formation) pour mesurer les causes et les conséquences de défaillances de cause commune ? | 2.0 | 3.0 | 2.0 | 3.0 |
| Les agents de maintenance ont-ils été formés (sur la base d'une documentation de formation) pour mesurer les causes et les conséquences de défaillances de cause commune ? | 0.5 | 4.5 | 0.5 | 4.5 |

## Contrôle de l’environnement

| L'accès du personnel est-il limité (par exemple armoires verrouillées, points inaccessibles) ? | 0.5 | 2.5 | 0.5 | 2.5 |
| Le système est-il en mesure de fonctionner toujours dans la plage de température, d'humidité, de corrosion, de poussière, de vibrations, etc. pour laquelle il a été soumis à essai, sans utiliser un contrôle extérieur de l'environnement ? | 3.0 | 1.0 | 3.0 | 1.0 |
| Tous les câbles de signaux et d'alimentation sont-ils séparés en tous points de connexion ? | 2.0 | 1.0 | 2.0 | 1.0 |

## Essais environnementaux

| L'immunité du système a-t-elle été évaluée pour toutes les influences environnementales significatives (par exemple compatibilité électromagnétique (CEM), température, vibrations, chocs, humidité) à un niveau approprié comme spécifié dans les normes reconnues ? | 10.0 | 10.0 | 10.0 | 10.0 |

Tableau D.2 – Valeur de Z – électronique programmable

| Couverture de diagnostic | Moins de 1 min | Entre 1 min et 5 min | Plus de 5 min |
|---|---|---|---|
| ≥ 99 % | 2.0 | 1.0 | 0 |
| ≥ 90 % | 1.5 | 0.5 | 0 |
| ≥ 60 % | 1.0 | 0 | 0 |

Tableau D.3 – Valeur de Z – capteurs ou éléments finaux

| Couverture de diagnostic | Moins de 2 h | Entre 2 h et deux jours | Entre deux jours et une semaine | Plus d'une semaine |
|---|---|---|---|---|
| ≥ 99 % | 2.0 | 1.5 | 1.0 | 0 |
| ≥ 90 % | 1.5 | 1.0 | 0.5 | 0 |
| ≥ 60 % | 1.0 | 0.5 | 0 | 0 |

Petit détail utile pour tes LOPA / calculs CCF IEC 61508 :

Les tableaux D1 + D2 + D3 servent au score CCF (β-factor justification).

En pratique industrie, on calcule :

𝑆
𝑐
𝑜
𝑟
𝑒
=
𝑋
+
𝑌
+
𝑍
Score=X+Y+Z

et ≥ 65 ⇒ CCF acceptable.

Tableau D.4 – Calcul de βint ou de Dint

| Résultat (S ou SD) | Sous-système logique | Capteurs ou éléments finaux |
|---|---|---|
| 120 ou supérieur | 0,5 % | 1 % |
| 70 à 120 | 1 % | 2 % |
| 45 à 70 | 2 % | 5 % |
| Inférieur à 45 | 5 % | 10 % |

Tableau D.5 – Calcul de β pour des systèmes à niveaux de redondance supérieurs à 1oo2

| MooN | N=2 | N=3 | N=4 | N=5 |
|---|---|---|---|---|
| M=1 | βint | 0,5 βint | 0,3 βint | 0,2 βint |
| M=2 | - | 1,5 βint | 0,6 βint | 0,4 βint |
| M=3 | - | - | 1,75 βint | 0,8 βint |
| M=4 | - | - | - | 2 βint |

Tableau D.6 – Exemples de valeurs pour l’électronique programmable

| Catégorie | Type | Diversité du système avec essai de diagnostic satisfaisant | Diversité du système avec essai de diagnostic médiocre | Redondance du système avec essai de diagnostic satisfaisant | Redondance du système avec essai de diagnostic médiocre |
|---|---|---|---|---|---|
| Séparation/ségrégation | X | 3,50 | 3,50 | 3,50 | 3,50 |
|  | Y | 1,50 | 1,50 | 1,50 | 1,50 |
| Diversité/redondance | X | 14,50 | 14,50 | 2,00 | 2,00 |
|  | Y | 3,00 | 3,00 | 1,00 | 1,00 |
| Complexité/conception/... | X | 2,75 | 2,75 | 2,75 | 2,75 |
|  | Y | 2,25 | 2,25 | 2,25 | 2,25 |
| Evaluation/analyse/... | X | 0,25 | 0,25 | 0,25 | 0,25 |
|  | Y | 4,75 | 4,75 | 4,75 | 4,75 |
| Procédures/interface humaine | X | 3,50 | 3,50 | 3,50 | 3,50 |
|  | Y | 3,00 | 3,00 | 3,00 | 3,00 |
| Compétence/formation/... | X | 1,25 | 1,25 | 1,25 | 1,25 |
|  | Y | 3,75 | 3,75 | 3,75 | 3,75 |
| Contrôle de l’environnement | X | 2,75 | 2,75 | 2,75 | 2,75 |
|  | Y | 2,25 | 2,25 | 2,25 | 2,25 |
| Essai environnemental | X | 5,00 | 5,00 | 5,00 | 5,00 |
|  | Y | 5,00 | 5,00 | 5,00 | 5,00 |
| Couverture de diagnostic | Z | 2,00 | 0,00 | 2,00 | 0,00 |
| Total X |  | 33,5 | 33,5 | 21 | 21 |
| Total Y |  | 25,5 | 25,5 | 23,5 | 23,5 |
| Résultat S |  | 59 | 59 | 44,5 | 44,5 |
| β |  | 2 % | 2 % | 5 % | 5 % |
| Résultat SD |  | 126 | 59 | 86,5 | 44,5 |
| βD |  | 0,5 % | 2 % | 1 % | 5 % |
| Système diversifié 1002 (Tableau D.5) |  | 0,5 % | 2 % |  |  |
| Le système non diversifié est triplex avec logique majoritaire 2003 (Tableau D.5) |  |  |  | 1,5 % | 7,5 % |


D.7 Taux de défaillance binomiale (Modèle des chocs) – approche CCF
Le retour d’expérience relatif à la défaillance de cause commune (CCF) indique que si
plusieurs défaillances doubles, quelques défaillances triples et voire une défaillance
quadruple ont été observées, aucune défaillance multiple au-delà de l’ordre quatre n’a jamais
été observée à partir d’une cause unique explicite qui aurait pu ne pas être identifiée pendant
l’analyse de sécurité. Par conséquent, la probabilité de défaillances dépendantes multiples
diminue lorsque l’ordre de la CCF augmente. Par conséquent, si le modèle du facteur β est
réaliste pour les défaillances doubles, légèrement pessimiste pour les défaillances triples,
au-delà il devient beaucoup trop prudent. Considérons l’exemple type d’un système
instrumenté de sécurité qui ferme les n puits de production (par exemple n=150) d’un champ
pétrolier en cas de blocage de sortie. Bien entendu, 2, 3, voire 4 puits peuvent ne pas se
fermer du fait d’une CCF non explicite mais pas tous les n puits tels que modélisés par le
facteur β (sinon, la CCF est explicite et il convient de l’analyser comme une défaillance
individuelle). Un autre exemple type concerne le traitement de plusieurs couches de
protection en même temps. Par exemple, le fait de tenir compte de la CCF potentielle entre
capteurs de deux couches de protection peut impliquer de considérer les CCF entre six
capteurs (c’est-à-dire 3 capteurs pour chaque couche).
Plusieurs modèles ont été proposés [18] pour pallier cette difficulté mais la plupart d’entre
eux nécessitent un tel nombre de paramètres de fiabilité (par exemple, lettres grecques
multiples ou modèles α) qu’ils en deviennent non réalistes. Parmi ces modèles, le taux de
défaillance binomiale (Modèle des chocs), introduit par Vesely en 1977 et amélioré par
Atwood en 1986, fournit une solution pragmatique [18, 19]. Le principe repose sur le fait que
lorsqu’une CCF se produit, elle s’apparente à un choc sur les composants associés. Ce choc
peut être mortel (c’est-à-dire même effet que dans le modèle du facteur β) ou non mortel,
auquel cas il n’existe qu’une certaine probabilité de défaillance d’un composant donné du fait
du choc. La probabilité d’occurrence de k défaillances dues au choc non mortel est alors
distribuée de manière binomiale.
Ce modèle ne nécessite de mettre en oeuvre que 3 paramètres:
− ω taux de chocs mortels;
− ρ taux de chocs non mortels;
− γ probabilité conditionnelle de défaillance d’un composant due à un choc non mortel.
La Figure D.2 donne un exemple de mise en oeuvre de cette méthode au moyen d’un arbre
de panne.

lethal shock Logic of thesystem
failure rate
DCC
ω
+
DU
failures
Choc
mortel
Combinaison de portes logiques
(arbre de panne)
Choc non mortel
(taux de défaillance)
Défaillances indépendantes
par choc mortel )probabilité réelle)
Cn independent
DU failure
Cn
+
&
non lethal
shock
failure rate
ρ
Failure of Cn
on non - lethal
shock
γ
ET n
OU n
C2 independent
DU failure
C2
+
&
non lethal
shock
failure rate
ρ
Failure of C2
on non-lethal
shock
γ
ET 2
OU 2
C1 independent
DU failure
C1
+
&
non lethal
shock
failure rate
ρ
Failure of C1
on non - lethal
shock
γ
ET 1
OU 1
Logique du
système
DCC
taux de
défaillance par
choc mortel
Défaillances
DU
Défaillance DU
indépendante
de C1
Défaillance
de C1
par choc
non mortel
n composants
Défaillance DU
indépendante
de C2
Défaillance DU
indépendante
de Cn
Taux de
défaillance
par choc
non mortel
Taux de
défaillance
par choc
non mortel
Défaillance
de C2
par choc
non mortel
Taux de
défaillance
par choc
non mortel
Défaillance
de Cn
par choc
non mortel
Figure D.2 – Mise en oeuvre d’un modèle des chocs avec des arbres de panne
Des composants identiques peuvent être liés au modèle du facteur β en divisant β en deux
parties βL et βNL:
– β = βL +βNL
– taux de défaillance par choc mortel: λDU ×βL
– taux de défaillance par choc non mortel: λDU ×βNL
– taux de défaillance indépendante: λDU [1 - (βL +βNL )]
Dans l’arbre de panne représenté à la Figure D.2, on obtient:
− taux de chocs mortels: ω = λDU ×βL
− taux de chocs non mortels: ρ = λDU ×βNL /γ
Le principal problème réside toujours dans l’évaluation des valeurs des trois paramètres
(ω, ρ, γ) ou (βL , βNL , γ). La référence [19] donne certaines indications et d’autres références
sur les traitements statistiques permettant d’évaluer (ω, ρ, γ) à partir du retour d’expérience.
En l’absence de données, il est possible d’utiliser un raisonnement théorique en appliquant
des approches pragmatiques. Par exemple, il est possible d’utiliser la procédure suivante
avec modélisation par arbre de panne en présence de plus de 3 éléments similaires:
1) estimer β comme dans la méthode du facteur β;
2) considérer que βL est négligeable (βNL = β);
3) estimer γ pour assurer d'obtenir des résultats prudents. En considérant que les
défaillances doubles ont au moins un effet de l’ordre de 10 fois supérieur à la défaillance
quadruple (hypothèse de toute évidence prudente), la formule suivante peut être utilisée:

4
N
2
N
10 C
C
.
γ =
où
N est le nombre d’éléments similaires;
CN 2 est le nombre de défaillances doubles potentielles; et
CN 4 est le nombre de défaillances quadruples potentielles
4) calculer ρ en fonction du nombre de N éléments similaires:
3 3
N
2 2
N
DU
C γ C γ
βλ
ρ
+
=
En appliquant cette méthode, les contributeurs de tête sont des défaillances doubles et
triples, et les résultats sont prudents comparés à ceux obtenus avec la méthode du facteur β
avec seulement 3 composants. La CCF double et les défaillances triples sont correctement
prises en compte et les défaillances multiples non réalistes ne sont pas totalement négligées.
Ce modèle est très simple à mettre en oeuvre dans les modèles de calcul par arbre de panne
tels que ceux présentés dans l’Annexe B, par exemple, arbres de panne en B.4.3. Ceci
permet de facilement traiter des systèmes de sécurité comportant de nombreux composants
similaires de façon très simple.
D.8 Références
Les références [13] à [15] et [20] et [21] de la Bibliographie donnent des informations utiles
en ce qui concerne les défaillances de cause commune.
