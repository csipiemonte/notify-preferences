## Descrizione

Gestore delle preferenze di notifica per il progetto Notify (Piattaforma di notifica regionale).

## Configurazione

I dati sono salvati su DB [PostgreSQL](https://www.postgresql.org/), creare lo schema `unppreferences` ed eseguire lo script di creazione delle tabelle contenuto in `dbscript` 

## Installazione

* Compilare i sorgenti utilizzando [apache ant](https://ant.apache.org/), viene generato un file .tar (es: _preferencessrv-2.1.0.tar_)
* Estrarre il file .tar nella directory `/appserv/unp/notify/preferences`
* Eseguire il comando `npm install` per installare le dipendenze
* Eseguire lo script `preferences`
