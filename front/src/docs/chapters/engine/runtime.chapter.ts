import type { DocChapterData } from '@/docs/types'

export const engineRuntimeChapter: DocChapterData = {
  id: 'engine-runtime',
  group: 'engine',
  kicker: 'Engine A to Z · 02',
  title: 'Démarrer le backend et comprendre la chaîne d’appel',
  summary: 'Le moteur n’est pas appelé directement par le navigateur. Il est servi par le backend FastAPI, lui-même appelé par le front via le proxy de développement. Cette partie explique la chaîne complète et la commande de démarrage.',
  icon: 'Cpu',
  highlights: [
    {
      label: 'Serveur',
      value: 'FastAPI + uvicorn',
    },
    {
      label: 'Port attendu',
      value: '8000 en développement',
    },
    {
      label: 'Scripts',
      value: '`./scripts/dev-backend.sh` et `./scripts/dev-all.sh`',
    },
  ],
  blocks: [
    {
      title: 'Chaîne d’appel complète',
      intro: 'Quand un utilisateur lance un calcul, le front n’exécute pas lui-même le moteur scientifique. Il appelle le backend local qui prend ensuite le relais.',
      points: [
        'Le front envoie ses requêtes vers `/api/...`.',
        'En développement, Vite relaie ces appels vers le backend local démarré sur `http://127.0.0.1:8000`.',
        'Le backend FastAPI reçoit le contrat, appelle les services de calcul et renvoie un résultat JSON consommé par les vues front.',
      ],
      example: {
        title: 'Exemple de séquence',
        summary: 'Vous ouvrez `Vérification` et demandez un calcul. Le navigateur ne fait que transmettre l’entrée; le calcul réel est produit côté backend.',
        steps: [
          'Le front prépare le contrat de calcul à partir de la SIF courante.',
          'La requête part vers `/api/engine/sil/compute`.',
          'Le backend transforme la réponse moteur en résultat exploitable par le front.',
        ],
        result: 'Si le backend ne tourne pas ou tourne sur le mauvais port, la vue Engine ou Vérification remonte une erreur.',
      },
    },
    {
      title: 'Commande de démarrage locale',
      intro: 'La commande complète lance le serveur ASGI qui sert l’application backend en mode développement.',
      points: [
        'Commande directe: `cd /home/user/safeloop/backend` puis `.venv/bin/python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`.',
        '`main:app` signifie: importer le module `main.py` et exposer l’objet FastAPI nommé `app`.',
        '`--reload` redémarre automatiquement le serveur à chaque modification du backend pendant le développement.',
        'Pour éviter de retaper la commande, PRISM fournit `./scripts/dev-backend.sh` pour le backend seul et `./scripts/dev-all.sh` pour lancer front et backend ensemble.',
      ],
      snippet: {
        title: 'Séquence de démarrage locale',
        tone: 'terminal',
        code: `$ cd /home/user/safeloop
$ ./scripts/dev-backend.sh
$ curl -sS http://127.0.0.1:8000/health`,
        caption: 'Le front de développement attend le backend sur `8000`. Le test `/health` permet de vérifier rapidement que la chaîne répond.',
      },
    },
    {
      title: 'Endpoints utiles à connaître',
      intro: 'Quelques routes suffisent à vérifier que le backend tourne et à comprendre ce que le front lui demande.',
      points: [
        '`GET /health` vérifie que le backend répond.',
        '`GET /engine/library/components` expose la bibliothèque issue de `lambda_db`.',
        '`POST /engine/sil/compute` lance un calcul de SIF.',
        '`POST /engine/sil/report` produit les données nécessaires au rapport.',
      ],
    },
    {
      title: 'Pourquoi le port 8000 compte',
      intro: 'Le front de développement suppose que le backend est disponible sur un port précis. Si ce contrat implicite casse, le front paraît “en panne” alors que le problème vient seulement du raccord entre les deux.',
      points: [
        'Le proxy Vite du front est branché sur `localhost:8000` pour les appels `/api`.',
        'Si vous lancez le backend sur un autre port sans reconfigurer le proxy, les calculs et la bibliothèque ne répondront plus correctement.',
        'Le premier test simple consiste donc à vérifier `http://127.0.0.1:8000/health` avant de conclure à une erreur moteur.',
      ],
    },
  ],
}
