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
            <p>Select your property constraints for a general idea of whether your project may suit complying development (CDC) or needs a Council DA.</p>
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
      title = 'Possibly Exempt Development';
      badge = 'Exempt development (conditions apply)';
      badgeClass = 'badge-success';
      description = 'Many internal, non-structural renovations (such as kitchen updates, bathroom refits and joinery) can be exempt development under the Codes SEPP when its standards are met. Strata, heritage and structural or services work can still need approval, so confirm with your council or an accredited certifier first.';
      turnaround = 'No development consent is needed when the exempt standards are met';
      checklist = [
        'No development consent is needed when the exempt development standards are met.',
        'Usually covers internal, non-structural updates such as joinery and finishes.',
        'Plumbing, electrical and wet-area work must still be done by suitably licensed trades.',
      ];
    } else if (heritage === 'yes' || setbacks === 'non_compliant' || lotSize === 'small' || scope === 'second_storey') {
      pathway = 'da';
      title = 'Council Development Application (DA) Required';
      badge = 'Local Council Assessment';
      badgeClass = 'badge-warning';
      description = 'Because your project involves heritage conservation, boundary setback variations, or complex two-storey geometry, it exceeds standard Complying Development criteria and must be assessed under your Local Environmental Plan (LEP).';
      turnaround = 'Generally longer than a CDC, and it varies by council and site';
      checklist = [
        'Detailed architectural drawings, site survey, and shadow diagrams.',
        'Statement of Environmental Effects (SEE) and Heritage Impact Statement (if applicable).',
        'Council neighbour notification or exhibition, which usually applies.',
        'Construction Certificate (CC) required after DA consent before work begins.',
      ];
    } else {
      pathway = 'cdc';
      title = 'May Suit Complying Development (CDC)';
      badge = 'Possible CDC pathway';
      badgeClass = 'badge-primary';
      description = 'Your answers suggest the project may meet the complying development standards in the Codes SEPP. A council or an accredited certifier can assess a CDC. Eligibility depends on your zoning, lot and the specific standards, so it needs to be confirmed for your site.';
      turnaround = 'NSW Planning says fast-tracked approvals can be issued in as little as 20 days, plus any neighbour notification';
      checklist = [
        'A council or accredited certifier assesses the application against the standards.',
        'Needs to meet the lot size, building height and landscape standards for your zone.',
        'Neighbour notification applies (the standard process allows 14 days).',
        'Typically needs a Section 10.7 planning certificate, a site survey and engineering input.',
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
            <a href="/booking" class="btn btn-primary btn-small">Discuss Approvals on a Strategy Call <span aria-hidden="true">↗</span></a>
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
