Feature: Gestion des codes promotionnels au panier
  Afin de payer le bon montant
  En tant que client MicroShop
  Je veux appliquer au plus un code promotionnel à mon panier

  Rule: Les remises respectent leur seuil minimum, borne incluse

    Scenario Outline: Application réussie d'un code promo selon son seuil d'éligibilité
      Given un panier avec un sous-total de <sous_total> €
      When j'applique le code promo "<code_promo>"
      Then le code actif est "<code_actif>"
      And le total final de mon panier est de <total_final> €

      Examples:
        | sous_total | code_promo  | code_actif   | total_final |
        | 20.00      | BIENVENUE10 | BIENVENUE10  | 18.00       |
        | 50.00      | BIENVENUE10 | BIENVENUE10  | 45.00       |
        | 30.00      | PROMO05     | PROMO05      | 25.00       |
        | 30.00      | PROM05      | PROMO05      | 25.00       |

    Scenario Outline: Rejet juste sous le seuil minimum
      Given un panier avec un sous-total de <sous_total> €
      When j'applique le code promo "<code_promo>"
      Then le code promo est refusé
      And aucune remise n'est appliquée
      And le total final de mon panier reste à <sous_total> €

      Examples:
        | sous_total | code_promo  |
        | 19.99      | BIENVENUE10 |
        | 29.99      | PROMO05     |
        | 29.99      | PROM05      |
        | 29.99      | CADEAU40    |

  Rule: Le total final ne peut jamais être négatif

    @api
    Scenario: Le backend plafonne une remise fixe à la valeur du panier
      Given un panier avec un sous-total de 30.00 €
      When j'applique le code promo "CADEAU40" d'une valeur de 40.00 €
      Then la remise effective est de 30.00 €
      And le total final de mon panier est de 0.00 €
      And le montant retourné par l'API n'est pas négatif

    @ui
    Scenario: Le frontend n'affiche jamais de montant négatif
      Given un panier avec un sous-total de 30.00 €
      When j'applique le code promo "CADEAU40"
      Then le récapitulatif du panier affiche un total de "0,00 €"
      And aucun montant négatif n'est affiché

  Rule: Un seul code promotionnel peut être actif

    @api @ui
    Scenario Outline: Un second code valide remplace automatiquement le premier sans cumul
      Given un panier avec un sous-total de 100.00 €
      And le code promo "<ancien_code>" est actif
      When j'applique le code promo "<nouveau_code>"
      Then le seul code actif est "<code_actif>"
      And le code remplacé est "<code_remplace>"
      And le total final de mon panier est de <total_final> €
      And une notification indique clairement le remplacement de "<code_remplace>" par "<code_actif>"

      Examples:
        | ancien_code | nouveau_code | code_actif  | code_remplace | total_final |
        | PROMO05     | BIENVENUE10  | BIENVENUE10 | PROMO05       | 90.00       |
        | BIENVENUE10 | PROMO05      | PROMO05     | BIENVENUE10   | 95.00       |
        | PROM05      | BIENVENUE10  | BIENVENUE10 | PROMO05       | 90.00       |

    @api @ui
    Scenario: Un second code invalide ne désactive pas le code déjà actif
      Given un panier avec un sous-total de 50.00 €
      And le code promo "BIENVENUE10" est actif
      When j'applique le code promo "INCONNU"
      Then le code promo est refusé
      And le seul code actif reste "BIENVENUE10"
      And le total final de mon panier reste à 45.00 €

  Rule: Un code reste valide jusqu'à 23:59:59 inclus le jour de son expiration

    @horloge-controlee
    Scenario: Le code est encore valide à la dernière seconde du jour J
      Given un code promo éligible expirant le 10 juillet 2026
      And l'horloge métier indique le 10 juillet 2026 à 23:59:59
      When j'applique ce code promo
      Then le code promo est accepté

    @horloge-controlee
    Scenario: Le code est expiré dès la première seconde du lendemain
      Given un code promo éligible expirant le 10 juillet 2026
      And l'horloge métier indique le 11 juillet 2026 à 00:00:00
      When j'applique ce code promo
      Then le code promo est refusé
      And le message d'erreur est exactement "Ce code promo est expiré."
