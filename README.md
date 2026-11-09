# Combien au Loto ?

Simulateur ludique : choisissez le train de vie que vous voulez — un revenu mensuel net, ou un mode de vie composé (maisons, yacht, voitures, voyages selon la taille du foyer, personnel, école des enfants, donations) — et découvrez le jackpot qu'il faudrait gagner au Loto ou à l'EuroMillions pour le financer.

**En ligne :** https://sylvainpgt.github.io/combien-au-loto/

## Le modèle

- **Jackpot nécessaire** = achats du premier jour + capital placé pour financer les dépenses annuelles + marge de sécurité.
- Les gains FDJ ne sont pas imposés ; les revenus du capital placé le sont (flat tax 31,4 % en 2026, réglable).
- Le capital placé verse les dépenses annuelles en euros constants, au taux réel net `(1 + r·(1 − t)) / (1 + i) − 1`, soit jusqu'à un âge donné (annuité), soit indéfiniment (rente perpétuelle).
- Immobilier : frais de notaire 8 %, entretien et taxes 2,5–3 %/an, IFI au barème (abattement 30 % sur la résidence principale).
- Donations aux enfants : abattement de 100 000 € par parent et par enfant, puis barème en ligne directe.
- Loto : 1 chance sur 19 068 840, 3 tirages/semaine, jackpot de 2 M€ + 1 M€ par tirage sans gagnant. EuroMillions : 1 sur 139 838 160, plafond 250 M€.

Les prix sont des ordres de grandeur, modifiables dans `calc.js`.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Page |
| `style.css` | Styles |
| `calc.js` | Moteur de calcul pur (testable avec Node) |
| `app.js` | Formulaire, rendu, lien de partage |

Site statique, sans dépendance ni build. En local : `python3 -m http.server` puis http://localhost:8000.

Jouer comporte des risques : Joueurs Info Service, 09 74 75 13 13.
