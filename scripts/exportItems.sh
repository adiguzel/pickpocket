#!/bin/sh
DB="zalando" 
COLLECTION="items"
FIELDFILE="exportFields.txt"
OUTDIR="../exports/items.csv"

mongoexport --db $DB --collection $COLLECTION --csv --fieldFile $FIELDFILE --out $OUTDIR