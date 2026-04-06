/**
 * Known disposable / burner email domains.
 * This list covers the most widely used services.
 * Add more as needed — the check is O(1) via a Set.
 */
const BURNER_DOMAINS = new Set([
  // Mailinator family
  "mailinator.com", "mailinator2.com", "trashmail.com", "trashmail.at",
  "trashmail.io", "trashmail.me", "trashmail.net",
  // Guerrilla Mail
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "guerrillamail.biz", "guerrillamail.de", "guerrillamail.info",
  "grr.la", "sharklasers.com", "guerrillamailblock.com",
  // Temp Mail
  "tempmail.com", "tempmail.net", "temp-mail.org", "temp-mail.ru",
  "tempr.email", "tmpmail.net", "tmpmail.org",
  // 10 Minute Mail
  "10minutemail.com", "10minutemail.net", "10minutemail.org",
  "10minutemail.co.uk", "10minutemail.de", "10minutemail.ru",
  "10minemail.com", "10mail.org",
  // Yopmail
  "yopmail.com", "yopmail.fr", "cool.fr.nf", "jetable.fr.nf",
  "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr",
  "courriel.fr.nf", "moncourrier.fr.nf", "monemail.fr.nf",
  // Discard / Throwaway
  "discard.email", "discardmail.com", "discardmail.de",
  "throwam.com", "throwam.net", "throwaway.email",
  "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
  // Fake inbox
  "fakeinbox.com", "fakeinbox.net", "maildrop.cc",
  "mailnull.com", "mailnull.net",
  // Spam / junk
  "spam4.me", "spaml.de", "spamspot.com", "spamthisplease.com",
  "spamfree24.org", "spamfree.eu",
  // Get2Mail / Jetable
  "get2mail.fr", "jetable.com", "jetable.net", "jetable.org",
  "jetable.pp.ua", "noclickemail.com",
  // Misc popular throwaway services
  "mailnesia.com", "mailnesia.net",
  "mailexpire.com",
  "filzmail.com",
  "spikio.com",
  "mytemp.email",
  "getnada.com",
  "tempemail.net",
  "zetmail.com",
  "dispostable.com",
  "mailsac.com",
  "inboxbear.com",
  "moakt.com",
  "moakt.co",
  "moakt.ws",
  "mohmal.com",
  "owlpic.com",
  "crazymailing.com",
  "binkmail.com",
  "safetymail.info",
  "sogetthis.com",
  "spamevader.com",
  "spam.la",
  "incognitomail.org",
  "incognitomail.com",
  "incognitomail.net",
  "mailbidon.com",
  "spamoff.de",
  "spamcowboy.com",
  "spamcowboy.net",
  "spamcowboy.org",
  "emailtemporanea.com",
  "emailtemporanea.net",
  "emailtemporanea.org",
  "email-jetable.fr",
  "emailsensei.com",
]);

/**
 * Returns true if the email uses a known disposable/burner domain.
 * @param {string} email
 * @returns {boolean}
 */
const isBurnerEmail = (email) => {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return true; // malformed → treat as burner
  return BURNER_DOMAINS.has(domain);
};

module.exports = { isBurnerEmail, BURNER_DOMAINS };
