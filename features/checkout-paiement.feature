Feature: Paiement de la commande

  Scenario: Paiement réussi avec une carte valide
    Given mon panier contient 1 "Casque audio" pour un total de 49.90 €
    When je paie avec une carte valide
    Then le paiement est accepté
    And une commande est créée avec le statut "En attente de préparation"
    And mon panier est vidé

  Scenario: Paiement refusé avec une carte refusée
    Given mon panier contient 1 "Casque audio" pour un total de 49.90 €
    When je paie avec une carte refusée
    Then le paiement est refusé avec le message "carte refusée"
    And aucune commande n'est créée
    And mon panier reste intact

  Scenario: Paiement refusé suite à un timeout
    Given mon panier contient 1 "Casque audio" pour un total de 49.90 €
    When je paie avec un paiement en timeout
    Then le paiement est refusé avec le message "délai dépassé"
    And aucune commande n'est créée
    And mon panier reste intact
