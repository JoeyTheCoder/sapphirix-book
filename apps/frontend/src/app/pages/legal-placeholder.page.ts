import { NgFor } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { AppFooterComponent } from '../shared/app-footer.component';

type LegalPageKey = 'impressum' | 'datenschutz' | 'agb' | 'kontakt';

type LegalPageContent = {
  eyebrow: string;
  title: string;
  lead: string;
  blocks: Array<{
    heading: string;
    body: string;
  }>;
};

const legalContent: Record<LegalPageKey, LegalPageContent> = {
 impressum: {
  eyebrow: 'RECHTLICHES',
  title: 'Impressum',
  lead: 'Angaben gemäss Schweizer Recht zur Anbieterkennzeichnung dieser Anwendung.',
  blocks: [
    {
      heading: 'Betreiber',
      body: 'Joel Sahli\n8880 Walenstadt\nSchweiz',
    },
    {
      heading: 'Kontakt',
      body: 'E-Mail: info@fadeflow.ch\nWebsite: https://joelsahli.ch',
    },
    {
      heading: 'Verantwortlich für den Inhalt',
      body: 'Joel Sahli\nE-Mail: info@fadeflow.ch',
    },
    {
      heading: 'Haftungsausschluss',
      body: 'Die Inhalte dieser Anwendung werden mit grösstmöglicher Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten Inhalte übernehmen wir jedoch keine Gewähr. Technische Änderungen, Verfügbarkeiten und Funktionsumfang können sich im Rahmen der Weiterentwicklung ändern.',
    },
    {
      heading: 'Haftung für externe Links',
      body: 'Diese Anwendung kann Links zu externen Websites Dritter enthalten. Auf deren Inhalte haben wir keinen Einfluss. Für die Inhalte verlinkter Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.',
    },
    {
      heading: 'Urheberrecht',
      body: 'Die durch den Betreiber erstellten Inhalte, Texte, Designs, Logos und Softwarebestandteile dieser Anwendung unterliegen dem Urheberrecht. Eine Verwendung, Vervielfältigung oder Weitergabe ohne vorherige schriftliche Zustimmung ist nicht gestattet, soweit dies nicht gesetzlich erlaubt ist.',
    },
    {
      heading: 'Datenschutz',
      body: 'Informationen zur Bearbeitung personenbezogener Daten finden Sie in unserer Datenschutzerklärung.',
    },
    {
      heading: 'Stand',
      body: 'April 2026',
    },
  ],
},
  datenschutz: {
  eyebrow: 'RECHTLICHES',
  title: 'Datenschutzerklärung',
  lead: 'In dieser Datenschutzerklärung informieren wir darüber, wie wir Personendaten im Zusammenhang mit dieser Anwendung bearbeiten.',
  blocks: [
    {
      heading: 'Verantwortliche Stelle',
      body: 'Joel Sahli\n8880 Walenstadt\nSchweiz\nE-Mail: info@fadeflow.ch',
    },
    {
      heading: 'Allgemeines',
      body: 'Wir bearbeiten Personendaten gemäss dem Schweizer Datenschutzgesetz. Personendaten sind alle Angaben, die sich auf eine bestimmte oder bestimmbare natürliche Person beziehen. Dazu gehören zum Beispiel Name, Telefonnummer, E-Mail-Adresse, Buchungsdaten und technische Nutzungsdaten.',
    },
    {
      heading: 'Welche Daten wir bearbeiten',
      body: 'Im Rahmen der Nutzung dieser Anwendung können insbesondere folgende Daten bearbeitet werden:\n\n- Kontaktdaten wie Name, Telefonnummer und E-Mail-Adresse\n- Buchungsdaten wie gewählte Dienstleistung, Datum, Uhrzeit und Status der Buchung\n- Salon- und Administrationsdaten wie Öffnungszeiten, Dienstleistungen und Termine\n- technische Daten wie IP-Adresse, Browser, Gerätetyp, Zugriffszeitpunkt und Logdaten\n- Kommunikationsdaten, wenn Sie uns per E-Mail oder über andere Kanäle kontaktieren',
    },
    {
      heading: 'Zwecke der Datenbearbeitung',
      body: 'Wir bearbeiten Personendaten insbesondere zu folgenden Zwecken:\n\n- Bereitstellung der Online-Buchungsfunktion\n- Verwaltung und Anzeige von Terminen für Salonbetreiber\n- Kommunikation im Zusammenhang mit Buchungen, Anfragen und Support\n- Versand von Buchungsbestätigungen oder administrativen Mitteilungen\n- Verbesserung, Sicherheit und Stabilität der Anwendung\n- Verhinderung von Missbrauch, Spam und unberechtigten Buchungen\n- Erfüllung gesetzlicher Pflichten',
    },
    {
      heading: 'Daten von Kundinnen und Kunden der Salons',
      body: 'Wenn eine Person über die Anwendung einen Termin bei einem Salon bucht, werden die eingegebenen Daten verarbeitet, damit der Termin erstellt, verwaltet und bestätigt werden kann. Der jeweilige Salon kann diese Daten im Administrationsbereich einsehen und zur Durchführung des Termins verwenden.',
    },
    {
      heading: 'Daten von Salonbetreibern und Administratoren',
      body: 'Für den Zugang zum Administrationsbereich können Login- und Kontaktdaten von Salonbetreibern oder Mitarbeitenden verarbeitet werden. Diese Daten werden verwendet, um den Zugang zur Anwendung bereitzustellen, Berechtigungen zu prüfen und die Nutzung der Plattform zu ermöglichen.',
    },
    {
      heading: 'Weitergabe von Daten an Dritte',
      body: 'Wir geben Personendaten nur weiter, soweit dies für den Betrieb der Anwendung, die Erbringung unserer Leistungen, die Erfüllung gesetzlicher Pflichten oder die Wahrung berechtigter Interessen erforderlich ist. Dazu können insbesondere Hosting-Anbieter, E-Mail-Dienstleister, Authentifizierungsdienste, technische Dienstleister und die jeweils beteiligten Salons gehören.',
    },
    {
      heading: 'Externe Dienstleister',
      body: 'Für den Betrieb der Anwendung können externe Dienstleister eingesetzt werden, zum Beispiel für Hosting, Datenbankbetrieb, E-Mail-Versand, Authentifizierung, Fehleranalyse oder Sicherheitsfunktionen. Diese Dienstleister bearbeiten Daten grundsätzlich nur im Rahmen der bereitgestellten technischen Leistungen.',
    },
    {
      heading: 'Datenbearbeitung im Ausland',
      body: 'Je nach eingesetzten technischen Dienstleistern kann es vorkommen, dass Personendaten auch in Staaten ausserhalb der Schweiz bearbeitet werden. In solchen Fällen achten wir darauf, dass ein angemessenes Datenschutzniveau besteht oder geeignete Schutzmassnahmen vorgesehen sind.',
    },
    {
      heading: 'Speicherdauer',
      body: 'Wir speichern Personendaten nur so lange, wie dies für die jeweiligen Zwecke erforderlich ist, gesetzliche Aufbewahrungspflichten bestehen oder berechtigte Interessen an der Speicherung vorliegen. Buchungs- und Administrationsdaten können während der Nutzung der Anwendung und darüber hinaus im Rahmen gesetzlicher oder betrieblicher Anforderungen gespeichert werden.',
    },
    {
      heading: 'Sicherheit',
      body: 'Wir treffen angemessene technische und organisatorische Massnahmen, um Personendaten vor Verlust, Missbrauch, unberechtigtem Zugriff und unbefugter Offenlegung zu schützen. Dazu gehören insbesondere Zugriffsbeschränkungen, verschlüsselte Übertragung, sorgfältige Systemkonfiguration und regelmässige Überprüfung der technischen Infrastruktur.',
    },
    {
      heading: 'Cookies und ähnliche Technologien',
      body: 'Diese Anwendung kann Cookies oder ähnliche Technologien verwenden, um grundlegende Funktionen bereitzustellen, die Nutzung zu ermöglichen, Sicherheit zu gewährleisten oder Einstellungen zu speichern. Falls Analyse- oder Marketingdienste eingesetzt werden, wird diese Datenschutzerklärung entsprechend ergänzt.',
    },
    {
      heading: 'Server-Logdaten',
      body: 'Beim Zugriff auf die Anwendung können automatisch technische Daten erfasst werden, zum Beispiel IP-Adresse, Datum und Uhrzeit des Zugriffs, verwendeter Browser, Betriebssystem, aufgerufene Seiten und Fehlermeldungen. Diese Daten werden verwendet, um die Sicherheit, Stabilität und Fehleranalyse der Anwendung zu gewährleisten.',
    },
    {
      heading: 'Ihre Rechte',
      body: 'Betroffene Personen können im Rahmen des anwendbaren Datenschutzrechts Auskunft über die über sie bearbeiteten Personendaten verlangen. Sie können ausserdem unter bestimmten Voraussetzungen die Berichtigung, Löschung oder Einschränkung der Bearbeitung verlangen. Anfragen können an info@fadeflow.ch gerichtet werden.',
    },
    {
      heading: 'Änderungen dieser Datenschutzerklärung',
      body: 'Wir können diese Datenschutzerklärung jederzeit anpassen, insbesondere wenn wir unsere Datenbearbeitung ändern oder neue rechtliche Anforderungen gelten. Es gilt die jeweils aktuelle Version, die in dieser Anwendung veröffentlicht ist.',
    },
    {
      heading: 'Stand',
      body: 'April 2026',
    },
  ],
},
  agb: {
     eyebrow: 'RECHTLICHES',
  title: 'Allgemeine Geschäftsbedingungen',
  lead: 'Diese Allgemeinen Geschäftsbedingungen regeln die Nutzung der Anwendung FadeFlow und die damit verbundenen Leistungen.',
  blocks: [
    {
      heading: '1. Anbieter',
      body: 'Anbieter dieser Anwendung ist:\n\nJoel Sahli\n8880 Walenstadt\nSchweiz\nE-Mail: info@fadeflow.ch',
    },
    {
      heading: '2. Geltungsbereich',
      body: 'Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Anwendung FadeFlow sowie für alle damit verbundenen Leistungen. FadeFlow richtet sich insbesondere an Salonbetreiber, Coiffeure, Barbershops und ähnliche Dienstleister, die Online-Terminbuchungen anbieten und verwalten möchten.\n\nAbweichende Bedingungen von Kundinnen und Kunden gelten nur, wenn sie ausdrücklich schriftlich bestätigt wurden.',
    },
    {
      heading: '3. Leistungsbeschreibung',
      body: 'FadeFlow stellt eine webbasierte Anwendung zur Verfügung, mit der Salonbetreiber Dienstleistungen, Öffnungszeiten und Termine verwalten sowie ihren Kundinnen und Kunden eine Online-Buchungsmöglichkeit anbieten können.\n\nDer genaue Funktionsumfang kann je nach Version, Konfiguration oder vereinbartem Leistungsumfang variieren. FadeFlow kann insbesondere folgende Funktionen umfassen:\n\n- öffentliche Buchungsseite für Salontermine\n- Verwaltung von Dienstleistungen und Öffnungszeiten\n- Terminübersicht und Terminverwaltung\n- Erfassung von Kundendaten im Zusammenhang mit Buchungen\n- E-Mail-Benachrichtigungen und weitere unterstützende Funktionen',
    },
    {
      heading: '4. Vertragsschluss',
      body: 'Ein Vertrag über die Nutzung von FadeFlow kommt zustande, wenn ein Kunde ein Angebot annimmt, eine Bestellung bestätigt, ein Benutzerkonto eingerichtet wird oder die Anwendung nach individueller Vereinbarung zur Nutzung bereitgestellt wird.\n\nBei kostenloser Testnutzung oder Pilotphasen entsteht kein Anspruch auf dauerhafte Bereitstellung der Anwendung, sofern nichts anderes vereinbart wurde.',
    },
    {
      heading: '5. Nutzung der Anwendung',
      body: 'Kundinnen und Kunden verpflichten sich, die Anwendung sachgemäss und rechtmässig zu nutzen. Zugangsdaten sind vertraulich zu behandeln und dürfen nicht an unbefugte Dritte weitergegeben werden.\n\nDer Kunde ist dafür verantwortlich, dass die von ihm hinterlegten Angaben, insbesondere Saloninformationen, Dienstleistungen, Preise, Öffnungszeiten und Buchungsregeln, korrekt und aktuell sind.',
    },
    {
      heading: '6. Buchungen durch Endkundinnen und Endkunden',
      body: 'FadeFlow ermöglicht Endkundinnen und Endkunden, Termine bei teilnehmenden Salons online anzufragen oder zu buchen. Der eigentliche Dienstleistungsvertrag über den Salontermin kommt zwischen dem jeweiligen Salon und der buchenden Person zustande.\n\nFadeFlow ist nicht Partei des Salontermins und übernimmt keine Verantwortung für die Durchführung, Qualität, Absage oder Verschiebung der vom Salon angebotenen Dienstleistungen.',
    },
    {
      heading: '7. Pflichten der Salonbetreiber',
      body: 'Salonbetreiber sind verpflichtet, ihre Buchungsinformationen korrekt zu pflegen und Termine regelmässig zu überprüfen. Sie sind selbst dafür verantwortlich, ihre Kundinnen und Kunden über relevante Bedingungen wie Preise, Stornierungsregeln, Verspätungen oder besondere Anforderungen zu informieren.\n\nSalonbetreiber dürfen die Anwendung nicht für rechtswidrige, missbräuchliche oder irreführende Zwecke verwenden.',
    },
    {
      heading: '8. Verfügbarkeit und technische Änderungen',
      body: 'FadeFlow bemüht sich um eine zuverlässige und möglichst unterbrechungsfreie Bereitstellung der Anwendung. Eine jederzeitige Verfügbarkeit kann jedoch nicht garantiert werden.\n\nWartungen, Sicherheitsupdates, technische Störungen, höhere Gewalt oder Ausfälle von Drittanbietern können die Verfügbarkeit zeitweise einschränken. FadeFlow ist berechtigt, die Anwendung weiterzuentwickeln, Funktionen anzupassen, zu erweitern oder zu entfernen, sofern dadurch der wesentliche Vertragszweck nicht unangemessen beeinträchtigt wird.',
    },
    {
      heading: '9. Preise und Zahlungsbedingungen',
      body: 'Die Preise und Zahlungsbedingungen richten sich nach dem individuell vereinbarten Angebot oder dem jeweils gültigen Preismodell.\n\nSofern nicht anders vereinbart, verstehen sich Preise in Schweizer Franken. Wiederkehrende Gebühren sind für den vereinbarten Abrechnungszeitraum geschuldet. Bei Zahlungsverzug kann der Zugang zur Anwendung nach angemessener Vorankündigung eingeschränkt oder gesperrt werden.',
    },
    {
      heading: '10. Testphase und Pilotkunden',
      body: 'Sofern FadeFlow im Rahmen einer Testphase, Pilotphase oder kostenlosen Erprobung bereitgestellt wird, kann der Funktionsumfang eingeschränkt sein. Eine Testphase kann jederzeit angepasst oder beendet werden, sofern nichts anderes schriftlich vereinbart wurde.\n\nAus einer kostenlosen Testnutzung entsteht kein Anspruch auf eine spätere kostenlose oder unveränderte Nutzung.',
    },
    {
      heading: '11. Laufzeit und Kündigung',
      body: 'Die Laufzeit und Kündigungsfristen richten sich nach der jeweiligen Vereinbarung mit dem Kunden. Sofern keine besondere Laufzeit vereinbart wurde, kann die Nutzung mit angemessener Frist beendet werden.\n\nDas Recht zur sofortigen Sperrung oder Kündigung aus wichtigem Grund bleibt vorbehalten, insbesondere bei missbräuchlicher Nutzung, erheblichen Vertragsverletzungen oder Zahlungsverzug.',
    },
    {
      heading: '12. Daten und Datenschutz',
      body: 'Bei der Nutzung von FadeFlow werden Personendaten verarbeitet. Einzelheiten zur Bearbeitung von Personendaten ergeben sich aus der Datenschutzerklärung.\n\nSoweit FadeFlow Personendaten im Auftrag eines Salonbetreibers bearbeitet, erfolgt die Bearbeitung grundsätzlich zur Bereitstellung der vereinbarten Anwendung und im Rahmen der erteilten Weisungen. Der Salonbetreiber bleibt für die Rechtmässigkeit der von ihm erfassten und verwendeten Daten verantwortlich.',
    },
    {
      heading: '13. Datensicherung',
      body: 'FadeFlow trifft angemessene technische und organisatorische Massnahmen zum Schutz der gespeicherten Daten. Dennoch liegt es auch in der Verantwortung der Kundinnen und Kunden, wichtige Informationen angemessen zu sichern oder zu exportieren, soweit entsprechende Funktionen angeboten werden.\n\nEin Anspruch auf unbegrenzte Speicherung oder Wiederherstellung von Daten besteht nur, wenn dies ausdrücklich vereinbart wurde.',
    },
    {
      heading: '14. Drittanbieter und externe Dienste',
      body: 'Für den Betrieb der Anwendung können externe Dienste eingesetzt werden, zum Beispiel für Hosting, Datenbankbetrieb, Authentifizierung, E-Mail-Versand, Analyse, Monitoring oder Sicherheitsfunktionen.\n\nFadeFlow ist berechtigt, geeignete Drittanbieter einzusetzen, soweit dies für den Betrieb, die Sicherheit oder die Weiterentwicklung der Anwendung erforderlich ist.',
    },
    {
      heading: '15. Geistiges Eigentum',
      body: 'Alle Rechte an der Anwendung, am Design, an Texten, Logos, Marken, Softwarebestandteilen und sonstigen Inhalten verbleiben bei FadeFlow beziehungsweise den jeweiligen Rechteinhabern.\n\nKundinnen und Kunden erhalten lediglich ein nicht übertragbares, nicht ausschliessliches Recht zur Nutzung der Anwendung im Rahmen der vereinbarten Leistungen.',
    },
    {
      heading: '16. Unzulässige Nutzung',
      body: 'Es ist untersagt, die Anwendung missbräuchlich zu verwenden, Sicherheitsmechanismen zu umgehen, unbefugt auf Daten oder Systeme zuzugreifen, Schadsoftware einzubringen, automatisierte Angriffe durchzuführen oder die Anwendung in einer Weise zu nutzen, die deren Betrieb, Sicherheit oder Integrität beeinträchtigt.\n\nBei Verdacht auf missbräuchliche Nutzung kann der Zugang vorübergehend eingeschränkt oder gesperrt werden.',
    },
    {
      heading: '17. Gewährleistung',
      body: 'FadeFlow wird mit angemessener Sorgfalt bereitgestellt und weiterentwickelt. Es wird jedoch keine Gewähr dafür übernommen, dass die Anwendung jederzeit fehlerfrei, unterbrechungsfrei oder für jeden konkreten Zweck geeignet ist.\n\nGemeldete Fehler werden nach Möglichkeit geprüft und innert angemessener Frist behoben, sofern dies technisch und wirtschaftlich zumutbar ist.',
    },
    {
      heading: '18. Haftung',
      body: 'Die Haftung von FadeFlow ist, soweit gesetzlich zulässig, auf direkte Schäden beschränkt, die durch absichtliches oder grobfahrlässiges Verhalten verursacht wurden.\n\nEine Haftung für indirekte Schäden, Folgeschäden, entgangenen Gewinn, Datenverlust, Betriebsunterbruch, ausgefallene Termine oder Ansprüche von Endkundinnen und Endkunden wird, soweit gesetzlich zulässig, ausgeschlossen.',
    },
    {
      heading: '19. Änderungen der AGB',
      body: 'FadeFlow kann diese Allgemeinen Geschäftsbedingungen jederzeit anpassen, insbesondere bei Änderungen der Anwendung, der angebotenen Leistungen oder der rechtlichen Rahmenbedingungen.\n\nDie jeweils aktuelle Version wird in der Anwendung veröffentlicht. Bei wesentlichen Änderungen können Kundinnen und Kunden zusätzlich informiert werden.',
    },
    {
      heading: '20. Anwendbares Recht und Gerichtsstand',
      body: 'Auf diese Allgemeinen Geschäftsbedingungen und die Nutzung von FadeFlow ist Schweizer Recht anwendbar.\n\nGerichtsstand ist, soweit gesetzlich zulässig, der Sitz beziehungsweise Wohnsitz des Anbieters.',
    },
    {
      heading: '21. Stand',
      body: 'April 2026',
    },
  ],
},
  kontakt: {
    eyebrow: 'SUPPORT',
    title: 'Kontakt',
    lead: 'Für Fragen und Anliegen',
    blocks: [
      {
        heading: 'Kontakt',
        body: 'E-Mail: info@fadeflow.ch',
      },
    ],
  },
};

@Component({
  selector: 'app-legal-placeholder-page',
  standalone: true,
  imports: [NgFor, AppFooterComponent],
  styles: [`
    .ff-legal-header { background: var(--ff-surface); border-bottom: 1px solid var(--ff-line); padding: 14px 24px; }
    .ff-legal-header-inner { max-width: 760px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .ff-legal-block-body { white-space: pre-line; }
    .ff-legal-back-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 7px 14px;
      font-size: 13px; font-weight: 500; color: var(--ff-ink-muted);
      background: transparent; border: 1px solid var(--ff-line);
      border-radius: var(--ff-r-md); cursor: pointer;
      transition: color 120ms, border-color 120ms;
    }
    .ff-legal-back-btn:hover { color: var(--ff-ink); border-color: var(--ff-line-strong); }
    @media (max-width: 760px) {
      .ff-legal-header { padding: 12px 16px; }
    }
  `],
  template: `
    <div style="min-height:100vh;background:var(--ff-bg);display:flex;flex-direction:column;">

      <!-- Navbar -->
      <header class="ff-legal-header">
        <div class="ff-legal-header-inner">
          <img src="assets/images/Logo-textside.png" alt="FadeFlow" style="height:26px;width:auto;" />
          <button type="button" class="ff-legal-back-btn" (click)="goBack()">
            <i class="pi pi-arrow-left" style="font-size:12px;"></i>
            Zurück
          </button>
        </div>
      </header>

      <main style="flex:1;">
        <div style="max-width:760px;margin:0 auto;padding:40px 24px 56px;">
          <p class="ff-mono" style="font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:var(--ff-ink-faint);margin:0 0 10px;">{{ content().eyebrow }}</p>
          <h1 class="ff-display" style="font-size:34px;color:var(--ff-ink);margin:0 0 10px;">{{ content().title }}</h1>
          <p style="font-size:14px;line-height:1.6;color:var(--ff-ink-muted);margin:0 0 28px;">{{ content().lead }}</p>

          <section style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);overflow:hidden;">
            <article *ngFor="let block of content().blocks; let isLast = last" style="padding:20px 24px;border-bottom:1px solid var(--ff-line);" [style.border-bottom]="isLast ? 'none' : '1px solid var(--ff-line)'">
              <h2 style="font-size:15px;font-weight:600;color:var(--ff-ink);margin:0 0 8px;">{{ block.heading }}</h2>
              <p class="ff-legal-block-body" style="font-size:13px;line-height:1.7;color:var(--ff-ink-muted);margin:0;">{{ block.body }}</p>
            </article>
          </section>
        </div>
      </main>

      <app-footer />
    </div>
  `,
})
export class LegalPlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  readonly content = computed(() => {
    const key = (this.route.snapshot.data['page'] as LegalPageKey | undefined) ?? 'impressum';
    return legalContent[key];
  });

  goBack(): void {
    this.location.back();
  }
}