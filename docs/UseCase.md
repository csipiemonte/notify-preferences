## Preferences

Un cittadino per poter ricevere notifiche, deve prima accettare i termini di utilizzo (se non ancora presente nella piattofrma), impostare i suoi contatti digitali e poi le sue preferenze per il servizio.

Nell'esempio seguente il cittadino ha il CF **PPPPLT80R10M082K** e il servizio del quale vuole ricevere le notifiche è **bollo_auto**.

1. Il cittadino accetta i termini di servizio:
	
	**PUT /api/v1/users/PPPPLT80R10M082K/terms**

	Headers:
	```
	x-authentication: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMzViMTYwNTAtY2MzMS00YTJlLTgxOTMtYWI1ZjM3MGQ2OTM1IiwicHJlZmVyZW5jZV9zZXJ2aWNlX25hbWUiOiJkZW1vX2ZlIiwiZXhwIjoyNTM0MDIyOTcxNDAsImlhdCI6MTYxNjQyNzc4MCwiYXBwbGljYXRpb25zIjp7InByZWZlcmVuY2VzIjpbInJlYWQiLCJ3cml0ZSJdLCJtZXgiOlsicmVhZCIsIndyaXRlIl0sImV2ZW50cyI6WyJyZWFkIl19LCJwcmVmZXJlbmNlcyI6e319.akQYdm0kPqqdtKUM1y2NSJxMMqCLYUsdS7Nh4xsqlTQ
	
	Shib-Iride-IdentitaDigitale: PPPPLT80R10M082K
	```

	Body:
	```
	{
		"hash": "884cea81ac2e24e9ef2af046e0fa5f72"
	}
	```

1. Il cittadino imposta i suoi contatti digitali:

    **PUT /api/v1/users/PPPPLT80R10M082K/contacts**

	Headers:
	```
	x-authentication: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMzViMTYwNTAtY2MzMS00YTJlLTgxOTMtYWI1ZjM3MGQ2OTM1IiwicHJlZmVyZW5jZV9zZXJ2aWNlX25hbWUiOiJkZW1vX2ZlIiwiZXhwIjoyNTM0MDIyOTcxNDAsImlhdCI6MTYxNjQyNzc4MCwiYXBwbGljYXRpb25zIjp7InByZWZlcmVuY2VzIjpbInJlYWQiLCJ3cml0ZSJdLCJtZXgiOlsicmVhZCIsIndyaXRlIl0sImV2ZW50cyI6WyJyZWFkIl19LCJwcmVmZXJlbmNlcyI6e319.akQYdm0kPqqdtKUM1y2NSJxMMqCLYUsdS7Nh4xsqlTQ
	
	Shib-Iride-IdentitaDigitale: PPPPLT80R10M082K
	```

	Body:  
	```
	{
		"sms": "00393112233445",
		"email": "my@email.it",
		"push": {
			"demo_fe":
				["dkMBmrbsNZg:APA91bHfP22izgJnhfjjmfIW8qa8Fe0BRekZ-W9i4ztiNdmYHQhc4K9htgRQu8PZSI7JiM5RnV4QG..."]
		},
		"language": "it_IT",
		"interests": "avvisi"
	}
	``` 

1. Il cittadino imposta le canalità su cui essere contattato per il servizio:
    
	**PUT /api/v1/users/PPPPLT80R10M082K/preferences/bollo_auto**

	Headers:
	```
	x-authentication: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMzViMTYwNTAtY2MzMS00YTJlLTgxOTMtYWI1ZjM3MGQ2OTM1IiwicHJlZmVyZW5jZV9zZXJ2aWNlX25hbWUiOiJkZW1vX2ZlIiwiZXhwIjoyNTM0MDIyOTcxNDAsImlhdCI6MTYxNjQyNzc4MCwiYXBwbGljYXRpb25zIjp7InByZWZlcmVuY2VzIjpbInJlYWQiLCJ3cml0ZSJdLCJtZXgiOlsicmVhZCIsIndyaXRlIl0sImV2ZW50cyI6WyJyZWFkIl19LCJwcmVmZXJlbmNlcyI6e319.akQYdm0kPqqdtKUM1y2NSJxMMqCLYUsdS7Nh4xsqlTQ
	
	Shib-Iride-IdentitaDigitale: PPPPLT80R10M082K
	```

	Body:
	```  
	{
		"channels": "push,email"
	} 
	```  


In questo modo il servizio censito su Preferences con il nome di **bollo_auto**, che ha abilitato le opportune canalità in fase di registrazione, può inviare messaggi al cittadino **PPPPLT80R10M082K**. Il cittadino riceverà notifiche push e email dal servizio, in quanto ha impostato solamente quelle preferenze di notifica.