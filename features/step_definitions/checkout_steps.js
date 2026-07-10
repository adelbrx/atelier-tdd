const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');

Given(
  'mon panier contient {int} {string} pour un total de {float} €',
  function (quantite, produit, montant) {
    this.panier = [{ produit, quantite }];
    this.sousTotal = montant;
    this.commande = null;
    this.resultatPaiement = null;
  }
);

When('je paie avec une carte valide', function () {
  // Simuler un appel réussi à PaymentGateway et stocker le résultat dans le World (this)
  this.resultatPaiement = { status: 'succes' };
});

When('je paie avec une carte refusée', function () {
  // Simuler un appel refusé par la banque
  this.resultatPaiement = { status: 'carte_refusee', message: 'carte refusée' };
});

When('je paie avec un paiement en timeout', function () {
  // Simuler une expiration de délai
  this.resultatPaiement = { status: 'timeout', message: 'délai dépassé' };
});

Then('le paiement est accepté', function () {
  assert.ok(this.resultatPaiement, 'Aucune transaction effectuée');
  assert.equal(this.resultatPaiement.status, 'succes');
  
  // Effet de bord : paiement accepté => vider le panier et créer commande
  this.commande = { statut: 'En attente de préparation' };
  this.panier = [];
});

Then('le paiement est refusé avec le message {string}', function (messageAttendu) {
  assert.ok(this.resultatPaiement, 'Aucune transaction effectuée');
  assert.notEqual(this.resultatPaiement.status, 'succes');
  assert.equal(this.resultatPaiement.message, messageAttendu);
  
  // Effet de bord : paiement refusé => panier conservé, pas de commande
  this.commande = null;
});

Then('une commande est créée avec le statut {string}', function (statut) {
  assert.ok(this.commande, 'Aucune commande n’a été générée');
  assert.equal(this.commande.statut, statut);
});

Then('aucune commande n\'est créée', function () {
  assert.equal(this.commande, null);
});

Then('mon panier est vidé', function () {
  assert.equal(this.panier.length, 0);
});

Then('mon panier reste intact', function () {
  assert.ok(this.panier.length > 0, 'Le panier a été vidé à tort');
});
