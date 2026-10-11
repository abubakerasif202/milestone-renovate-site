// NSW Renovation Approvals Feasibility Checker (CDC vs DA vs Exempt Development)

const root = document.querySelector('[data-approvals-checker]');

if (root) {
  const form = root.querySelector('form');
  const resultPanel = root.querySelector('[data-approvals-result]');

  function evaluate() {
    const data = new FormData(form);
    const heritage = data.get('heritage'); // 'yes' | 'no' | 'unsure'
    const scope = data.get('scope'); // 'internal_only' | 'ground_extension' | 'second_storey' | 'major_structural'
    const setbacks = data.get('setbacks'); // 'compliant' | 'non_compliant' | 'unsure'
    const lotSize = data.get('lotSize'); // 'standard' | 'small' | 'strata'

    if (!heritage || !scope) {
      if (resultPanel) {
        resultPanel.innerHTML = `
          <div class="approvals-card default-state">
            <h3>Answer the questions to check your approval pathway</h3>
            <p>Select your property constraints to determine whether your project qualifies for fast-track CDC or requires a Council DA.</p>
          </div>
        `;
      }
      return;
    }

    let pathway = 'cdc'; // 'exempt' | 'cdc' | 'da'
    let title = '';
    let badge = '';
    let badgeClass = '';
    let description = '';
    let turnaround = '';
    let checklist = [];

    if (scope === 'internal_only' && heritage === 'no') {
      pathway = 'exempt';
      title = 'Exempt Development (No Council Approval Required)';
      badge = 'Zero Council Delay';
      badgeClass = 'badge-success';
      description = 'Most internal non-structural residential renovations (kitchen updates, bathroom refits, joinery, and non-load-bearing wall changes) are classified as Exempt Development under NSW SEPP.';
      turnaround = 'Immediate start (trades can begin upon contract sign-off)';
      checklist = [
        'No formal Council DA or Certifier approval needed.',
        'Applies to internal layout updates, non-structural joinery and finishes.',
        'Standard trade coordination for plumbing, electrical and wet-area detailing.',
      ];
    } else if (heritage === 'yes' || setbacks === 'non_compliant' || lotSize === 'small' || scope === 'second_storey') {
      pathway = 'da';
      title = 'Council Development Application (DA) Required';
      badge = 'Local Council Assessment';
      badgeClass = 'badge-warning';
      description = 'Because your project involves heritage conservation, boundary setback variations, or complex two-storey geometry, it exceeds standard Complying Development criteria and must be assessed under your Local Environmental Plan (LEP).';
      turnaround = 'Approx. 60 – 120 days depending on your local Sydney council';
      checklist = [
        'Detailed architectural drawings, site survey, and shadow diagrams.',
        'Statement of Environmental Effects (SEE) and Heritage Impact Statement (if applicable).',
        'Council neighbour notification period (usually 14–21 days).',
        'Construction Certificate (CC) required after DA consent before work begins.',
      ];
    } else {
      pathway = 'cdc';
      title = 'Eligible for Fast-Track CDC (Complying Development Certificate)';
      badge = 'Fast-Track 20-Day Approval';
      badgeClass = 'badge-primary';
      description = 'Your project meets standard NSW Housing Code criteria under the Codes SEPP. You can bypass council backlogs completely by using an Accredited Private Certifier.';
      turnaround = 'Approx. 20 – 30 business days through an accredited certifier';
      checklist = [
        'Fast-track approval with zero Council committee delays.',
        'Complies with standard lot size, building height, and landscape ratios.',
        'Certifier issues approval directly with statutory 14-day neighbor notification.',
        'Requires Section 10.7 Planning Certificate, structural engineering sign-off, and site survey.',
      ];
    }

    if (resultPanel) {
      resultPanel.innerHTML = `
        <div class="approvals-card ${pathway}">
          <div class="approvals-card-header">
            <span class="approvals-badge ${badgeClass}">${badge}</span>
            <span class="approvals-timeline">Typical Timeline: ${turnaround}</span>
          </div>
          <h3>${title}</h3>
          <p class="approvals-desc">${description}</p>
          <div class="approvals-checklist">
            <h4>What to prepare for this pathway:</h4>
            <ul>
              ${checklist.map((item) => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          <div class="approvals-card-footer">
            <a href="/booking" class="btn btn-ruby btn-small">Discuss Approvals on a Strategy Call <span aria-hidden="true">↗</span></a>
            <a href="/plan-your-renovation" class="text-link">Start renovation brief ↗</a>
          </div>
        </div>
      `;
    }
  }

  form?.addEventListener('change', evaluate);
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    evaluate();
  });
  evaluate();
}
