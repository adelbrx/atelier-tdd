Feature: Gestion du panier d'achat

  Background:
    Given le catalogue contient les produits suivants :
      | produit         | prix  | stock |
      | Casque audio    | 49.90 | 12    |
      | Souris sans fil | 25.00 | 3     |

  Scenario: Ajouter un article disponible au panier
    Given mon panier est vide
    When j'ajoute 1 "Casque audio" à mon panier
    Then le sous-total de mon panier est de 49.90 €
    And mon panier contient 1 "Casque audio"

  Scenario: Ajouter plusieurs articles différents cumule les sous-totaux
    Given mon panier est vide
    When j'ajoute 1 "Casque audio" à mon panier
    And j'ajoute 2 "Souris sans fil" à mon panier
    Then le sous-total de mon panier est de 99.90 €
    And mon panier contient 1 "Casque audio"
    And mon panier contient 2 "Souris sans fil"

  Scenario: Refuser l'ajout d'une quantité supérieure au stock disponible
    Given mon panier est vide
    When j'ajoute 4 "Souris sans fil" à mon panier
    Then le sous-total de mon panier est de 0.00 €
    And l'erreur est "stock insuffisant"
