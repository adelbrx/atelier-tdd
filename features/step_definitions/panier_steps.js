const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');

Given('le catalogue contient les produits suivants :', function (table) {
  this.catalogue = {};
  table.hashes().forEach((ligne) => {
    this.catalogue[ligne.produit] = {
      prix: parseFloat(ligne.prix),
      stock: parseInt(ligne.stock, 10),
    };
  });
});

Given('mon panier est vide', function () {
  this.panier = [];
  this.erreur = null;
});

When("j'ajoute {int} {string} à mon panier", function (quantite, produit) {
  if (quantite > this.catalogue[produit].stock) {
    this.erreur = 'stock insuffisant';
    return;
  }
  this.panier.push({ produit, quantite });
  this.erreur = null;
});

Then('le sous-total de mon panier est de {float} €', function (montant) {
  const sousTotal = this.panier.reduce(
    (total, ligne) => total + this.catalogue[ligne.produit].prix * ligne.quantite,
    0
  );
  assert.equal(sousTotal, montant);
});

Then('mon panier contient {int} {string}', function (quantite, produit) {
  const lignes = this.panier.filter((ligne) => ligne.produit === produit);
  assert.equal(lignes.length, 1, `« ${produit} » absent du panier`);
  assert.equal(
    lignes[0].quantite,
    quantite,
    `quantité attendue ${quantite}, obtenue ${lignes[0].quantite}`
  );
});

Then('l\'erreur est {string}', function (message) {
  assert.equal(this.erreur, message);
});
