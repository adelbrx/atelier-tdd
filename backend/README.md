# MicroShop Promotions API

Backend FastAPI stateless pour appliquer ou retirer le code promotionnel actif du
panier. Les montants sont calculés avec `Decimal` et renvoyés sous forme de chaînes
à deux décimales.

## Démarrage

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

La documentation OpenAPI est disponible sur `http://127.0.0.1:8000/docs`.

## Contrat principal

```http
POST /api/promotions/apply
Content-Type: application/json

{
  "subtotal": "40.00",
  "code": "PROM05",
  "active_code": "BIENVENUE10"
}
```

```json
{
  "subtotal": "40.00",
  "discount": "5.00",
  "total": "35.00",
  "applied_code": "PROMO05",
  "replaced_code": "BIENVENUE10",
  "message": "Le code promo PROMO05 a remplacé le code BIENVENUE10."
}
```

Le retrait utilise `POST /api/promotions/remove` avec `subtotal` et l'éventuel
`active_code`. `GET /api/promotions` expose le catalogue utilisable par le client.

Ce contrat de calcul reçoit le sous-total afin de reproduire les scénarios BDD.
Dans un checkout réel, la couche panier doit recalculer ce montant depuis les prix
et quantités conservés côté serveur avant d'appeler `PromotionService`.

Les dates d'expiration du catalogue fourni restent à `null`, puisqu'aucune date
n'est donnée par les règles métier. Le moteur accepte cependant une date et une
horloge injectables ; la validité est calculée en `Europe/Paris` jusqu'à la dernière
microseconde du jour d'expiration incluse.

## Tests

Tests backend et boucle TDD interne :

```bash
cd backend
pytest
```

Scénarios Gherkin de la boucle BDD externe, depuis la racine du projet :

```bash
backend/.venv/bin/python -m behave
```
