@Context:Panier @Component:Promotions
Feature: Gestion des codes promotionnels au panier
  En tant que cliente de MicroShop
  Je veux appliquer un code promo à mon panier
  Afin de bénéficier d'une réduction immédiate sur mon achat

  Background:
    Given un catalogue de produits disponibles
    And mon panier est initialement vide

  @Nominal @Business @Seuils
  Scenario Outline: Application réussie d'un code promo selon les seuils d'éligibilité
    Given un panier avec un sous-total de <sous_total> €
    When j'applique le code promo "<code_promo>"
    Then le total final de mon panier est de <total_final> €

    Examples:
      | sous_total | code_promo  | total_final |
      | 20.00      | BIENVENUE10 | 18.00       |
      | 50.00      | BIENVENUE10 | 45.00       |
      | 30.00      | PROM05      | 25.00       |

  @Alternative @UX @ErreurSeuil
  Scenario: Refus d'un code promo si le seuil minimum d'achat n'est pas atteint
    Given un panier avec un sous-total de 19.99 €
    When j'applique le code promo "BIENVENUE10"
    Then le code est refusé avec le message "Le montant minimum de 20.00 € n'est pas atteint"
    And le total de mon panier reste de 19.99 €

  @Alternative @UX @ErreurExpiration
  Scenario: Refus d'un code promo si la date de validité est dépassée
    Given un panier avec un sous-total de 40.00 €
    And le code promo "BIENVENUE10" est expiré depuis le jour J-1
    When j'applique le code promo "BIENVENUE10"
    Then le code est refusé avec le message "Ce code promo est expiré."
    And le total de mon panier reste de 40.00 €

  @Exceptions @Securite @Remplacement
  Scenario: Saisie d'un second code valide entraînant le remplacement automatique du premier
    Given un panier avec un sous-total de 40.00 €
    And le code promo "BIENVENUE10" est déjà appliqué
    When j'applique le code promo "PROM05"
    Then le premier code est retiré au profit du nouveau code
    And le seul code actif est "PROMO05"
    And le total final de mon panier est de 35.00 €
    And le message de remplacement est "Le code promo PROMO05 a remplacé le code BIENVENUE10."

  @Alternative @Securite @NonCumul
  Scenario: Un second code invalide conserve le code déjà actif
    Given un panier avec un sous-total de 50.00 €
    And le code promo "BIENVENUE10" est déjà appliqué
    When j'applique le code promo "INCONNU"
    Then le code promo est refusé
    And le seul code actif reste "BIENVENUE10"
    And le total de mon panier reste de 45.00 €

  @Exceptions @Securite-Plancher
  Scenario: Application d'un code promo réduisant le montant au-delà de la valeur du panier
    Given un panier avec un sous-total de 30.00 €
    When j'applique un code promotionnel exceptionnel "CADEAU40" de valeur 40.00 €
    Then le total final de mon panier est de 0.00 €
    And le montant retourné n'est pas négatif

  @HorlogeControlee @BorneExpiration
  Scenario: Le code reste valide à la dernière seconde du jour J
    Given un code promo éligible expirant le 10 juillet 2026
    And l'horloge métier indique le 10 juillet 2026 à 23:59:59
    When j'applique ce code promo
    Then le code promo est accepté

  @HorlogeControlee @BorneExpiration
  Scenario: Le code expire à la première seconde du lendemain
    Given un code promo éligible expirant le 10 juillet 2026
    And l'horloge métier indique le 11 juillet 2026 à 00:00:00
    When j'applique ce code promo
    Then le code promo est refusé
    And le message d'erreur est exactement "Ce code promo est expiré."
