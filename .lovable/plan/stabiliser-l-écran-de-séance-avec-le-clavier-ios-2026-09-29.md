# Stabiliser l’écran de séance avec le clavier iOS

## Modifications
- Isoler la fenêtre de séance avec une hauteur figée et un positionnement indépendant du viewport du clavier.
- Garder l’en-tête et les boutons du bas ancrés dans la séance, avec uniquement la liste d’exercices défilable.
- Appliquer ce comportement uniquement à la séance en cours, sans modifier les autres fenêtres ni la navigation.
- Vérifier l’affichage et l’absence d’erreur après la modification.

## Détails techniques
- Ajouter des classes dédiées à la fenêtre, à sa zone défilable et à son pied de page.
- Utiliser un conteneur absolu de hauteur `--app-height`, des zones fixes non rétractables et une zone centrale `min-height: 0`.
