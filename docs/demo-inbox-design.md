# Public demo inbox — proposed next stage

Status: design only. Real ANU registration and reviewer invitations still use
SMTP ownership verification. No public captured inbox or demo-account creation
route is implemented by the Fly/email-test increment.

John proposed recognising `u` plus seven digits at `anu.edu.au` as a real
account, treating other input as a dummy address, and displaying its verification
message in a popup. ANU's [email guidance](https://services.anu.edu.au/information-technology/email/email-addresses-lists)
also describes staff name-based addresses and optional postgraduate aliases.
An address's syntax cannot prove ownership or safely choose its delivery route.

## Recommended flow

1. Offer explicit **Use my ANU email** and **Try a demo account** choices on
   registration/sign-in. Real addresses always receive SMTP verification;
   preserve support for UID-style addresses and ANU aliases.
2. The demo path asks for a display name and prototype password, then generates
   a unique address such as `alex-7b2c@enrolment.test`. A nickname is sufficient;
   do not ask visitors to invent an address in a real person's domain or use
   `@anu.edu.au` for a simulated identity. Show the generated address so they
   can use it again to sign in.
3. Open **Your demo inbox** as a normal page with a clearly labelled captured
   message and a verification link. A dialog can enhance it later, but the
   complete flow must work without JavaScript. The message is captured inside
   the app; no SMTP message is sent and no real inbox ownership is claimed.
4. Only that visitor can access their inbox through an unguessable browser
   capability; knowing or guessing a demo email address must not expose it.
   Keep real verification/invitation tokens entirely out of this subsystem.
   Links expire and are single-use, with an explicit confirmation POST.
5. Create a persistent, labelled fictional profile. Display **Demo account**
   throughout its session; never call it a verified ANU account. Account kind
   is server-controlled and cannot grant a real reviewer role. Separate guest
   data and review queues from real account access, and bound creation and
   model use before publishing this route.

The inbox needs database-backed account/message state and an explicit access
boundary, rather than a popup that exposes whatever email was typed. Reviewer
demo access and cross-browser inbox recovery need a defined scope before this
proposal is implemented.

## Repeating a real SMTP test

John chose to retain the existing account and academic data. **My account →
Send a fresh verification test** supplies repeatable real email checks through
a separate receipt token. This is implemented independently of the proposed
demo inbox. Full account deletion and re-registration are not included.
