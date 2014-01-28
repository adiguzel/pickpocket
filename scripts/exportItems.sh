#!/bin/sh
DB="test" 
COLLECTION="items"
FIELDFILE="exportFields.txt"
OUTDIR="../exports/items.csv"

mongoexport --db $DB --collection $COLLECTION --csv --fieldFile $FIELDFILE --out $OUTDIR