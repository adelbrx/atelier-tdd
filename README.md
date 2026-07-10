# MicroShop — codes promotionnels au panier

Implémentation complète de la fonctionnalité demandée avec une API FastAPI et
une interface React/Tailwind fondée sur des composants `shadcn/ui` locaux.

## Lancer le projet

### API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

L'API écoute sur `http://127.0.0.1:8000` et sa documentation OpenAPI est
disponible sous `/docs`.

### Interface

Dans un second terminal :

```bash
cd frontend
npm install
npm run dev
```

L'interface écoute sur `http://localhost:5173`. En développement, Vite relaie
automatiquement les appels `/api` vers FastAPI. Pour un déploiement séparé,
`VITE_API_BASE_URL` permet d'indiquer l'origine publique de l'API.

## Vérifications

Depuis la racine du projet :

```bash
backend/.venv/bin/python -m behave
backend/.venv/bin/python -m pytest backend/tests
npm --prefix frontend test
npm --prefix frontend run build
```

La spécification [`cart_promo_codes.feature`](tests/features/cart_promo_codes.feature)
est exécutable par Behave. Ses step definitions appellent l'API FastAPI, tandis
que `backend/tests/test_promotion_service.py` constitue la boucle TDD interne sur
le domaine. Cette séparation matérialise le workflow outside-in demandé.

Le contrat HTTP peut aussi être vérifié contre l'API démarrée :

```bash
MICROSHOP_API_URL=http://127.0.0.1:8000 \
  backend/.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
```

## Architecture frontend

La fonctionnalité panier suit une organisation *feature-first* sous
`frontend/src/features/cart` :

- `components/` contient un composant métier par fichier ;
- `hooks/` isole les appels asynchrones et l'état promotionnel ;
- `types.ts` centralise les contrats internes de la fonctionnalité ;
- `cart-items.ts` contient les données et leur sélection ;
- `index.ts` expose uniquement l'API publique de la fonctionnalité.

Les familles de primitives générées par shadcn/ui (`Card`, `Alert`, etc.) restent
regroupées dans leur fichier d'origine, conformément à la convention shadcn.

## Décisions métier

- les calculs backend utilisent `Decimal` et le total est plafonné à `0.00 €` ;
- `PROM05` est normalisé vers le code canonique `PROMO05` ;
- un second code valide remplace le code actif, sans addition des remises ;
- une expiration est évaluée dans le fuseau `Europe/Paris`, jusqu'à la fin du
  jour incluse ;
- aucune date arbitraire n'a été inventée pour le catalogue fourni : ses trois
  codes ont donc `expires_on: null`, tandis que le moteur et ses tests couvrent
  les promotions datées.

Le contrat principal est `POST /api/promotions/apply`. Le client transmet le
sous-total, le code saisi et le code actif éventuel ; l'API renvoie le code
canonique, la remise effective, le total et le code remplacé éventuel.

> Cette API isole le calcul demandé par les scénarios BDD, qui fournissent eux-mêmes
> le sous-total. Lors du branchement au paiement réel, le sous-total passé au
> service doit impérativement être recalculé depuis le panier persistant côté
> serveur, jamais accepté comme autorité depuis le navigateur.
