# Acceptation des codes promotionnels

La spécification exhaustive se trouve dans
`features/cart_promo_codes.feature`. Elle couvre les scénarios fournis, l'alias
`PROM05`, les seuils inclusifs, le remplacement sans cumul, la notification,
la borne d'expiration et le plancher à la fois côté API et côté interface.

## Contrat HTTP en boîte noire

`test_promotion_api_contract.py` ne dépend ni de FastAPI ni d'un client HTTP
tiers. Il vérifie l'API publique et peut donc être lancé contre n'importe quelle
implémentation conforme :

```shell
MICROSHOP_API_URL=http://127.0.0.1:8000 \
  python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Sans `MICROSHOP_API_URL`, seuls les tests HTTP sont explicitement ignorés au
lieu de faire échouer une installation qui ne démarre pas de serveur.

Les scénarios marqués `@horloge-controlee` exigent une horloge injectable : les
trois codes du catalogue fonctionnel n'ont volontairement aucune date
d'expiration, puisqu'aucune date n'est donnée par le besoin. Cette borne doit
donc être vérifiée au niveau du service métier avec une promotion de test, sans
ajouter de code périmé ni de porte dérobée à l'API publique.
`test_expiration_boundary_contract.py` effectue ce contrôle à 23:59:59, au tout
dernier instant du jour J et à minuit J+1, en heure de Paris ainsi qu'avec les
instants UTC équivalents.
