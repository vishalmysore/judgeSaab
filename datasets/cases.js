// datasets/cases.js
// Bundled sample cases. All facts and judgments here are ORIGINAL, synthetic
// scenarios written for benchmarking — they are inspired by the *style* of the
// named corpora but do not reproduce any real case text. Real dataset adapters
// (ECtHR, CaseHOLD, SCOTUS, COLIEE, Harvard Caselaw) can be added as plugins
// that fetch and normalize into this same schema.
//
// Case schema:
//   { id, dataset, jurisdiction, title, year, question, facts, options?,
//     human: { verdict, laws:[], reasoning } }
//
// verdict vocab is per-dataset; the evaluation engine maps to a canonical label.

export const SAMPLE_CASES = [
  // ---- ECtHR-style (human-rights, violation / no_violation) ----
  {
    id: 'ecthr-001',
    dataset: 'ECtHR',
    jurisdiction: 'Council of Europe',
    title: 'Marlow v. Republic of Veranthia',
    year: 2019,
    question:
      'Did the State violate the applicant’s right to a fair trial within a reasonable time?',
    facts:
      'The applicant was charged with tax fraud in 2011. The investigation lasted six years, ' +
      'during which the case file was transferred between three prosecutors, each restarting the ' +
      'review. Hearings were adjourned eleven times, nine of them at the request of the ' +
      'prosecution due to missing expert reports. The applicant made no adjournment requests and ' +
      'repeatedly asked the court to expedite proceedings. A first-instance verdict was delivered ' +
      'in 2017, more than six years after charges were laid, for a case of ordinary factual ' +
      'complexity.',
    human: {
      verdict: 'violation',
      laws: ['Article 6 § 1'],
      reasoning:
        'The overall length of six years for a case of ordinary complexity, with delays ' +
        'attributable to the authorities rather than the applicant, exceeded the reasonable-time ' +
        'requirement. The repeated restarts and prosecution-caused adjournments were the primary ' +
        'cause of delay.',
    },
  },
  {
    id: 'ecthr-002',
    dataset: 'ECtHR',
    jurisdiction: 'Council of Europe',
    title: 'Okonkwo v. Kingdom of Astoria',
    year: 2020,
    question:
      'Did the deportation order interfere disproportionately with the applicant’s right to respect for private and family life?',
    facts:
      'The applicant, a lawful resident for eighteen years, was ordered deported after a single ' +
      'conviction for a non-violent property offence for which he received a suspended sentence. ' +
      'He has a spouse and two minor children who are nationals of the respondent State and who ' +
      'do not speak the language of his country of origin. The domestic authorities weighed the ' +
      'best interests of the children, the length of residence, and the minor nature of the ' +
      'offence, and offered a five-year re-entry review.',
    human: {
      verdict: 'no_violation',
      laws: ['Article 8'],
      reasoning:
        'Although deportation interfered with family life, the domestic courts conducted a ' +
        'genuine balancing exercise, expressly considered the children’s best interests and ' +
        'the length of residence, and the measure was time-limited. The interference fell within ' +
        'the State’s margin of appreciation and was proportionate.',
    },
  },
  {
    id: 'ecthr-003',
    dataset: 'ECtHR',
    jurisdiction: 'Council of Europe',
    title: 'Petrova v. Federation of Kalvia',
    year: 2018,
    question:
      'Was the ban on the applicant’s peaceful demonstration a violation of freedom of assembly?',
    facts:
      'The applicant organised a peaceful protest of roughly forty people in a public square. ' +
      'Authorities banned it citing a blanket rule prohibiting all gatherings within 500 metres ' +
      'of government buildings, without any individualized assessment of risk. There was no ' +
      'evidence of a threat to public order, and counter-demonstrators were not expected. The ban ' +
      'was automatic and left no room for a less restrictive alternative such as relocation.',
    human: {
      verdict: 'violation',
      laws: ['Article 11'],
      reasoning:
        'A blanket ban applied without any individualized proportionality assessment, absent any ' +
        'concrete risk to public order, was not necessary in a democratic society. The State ' +
        'failed to consider less restrictive measures.',
    },
  },

  // ---- SCOTUS-style (affirmed / reversed) ----
  {
    id: 'scotus-001',
    dataset: 'SCOTUS',
    jurisdiction: 'United States',
    title: 'United States v. Hargrove',
    year: 2021,
    question:
      'Did a warrantless search of digital data on the defendant’s phone incident to arrest violate the Fourth Amendment?',
    facts:
      'Police arrested the defendant for a traffic violation and, without a warrant, searched the ' +
      'photos and messages on his smartphone, discovering evidence of an unrelated offence. The ' +
      'phone posed no risk of harm to officers once secured, and there was no exigency preventing ' +
      'the officers from obtaining a warrant. The trial court admitted the evidence; the ' +
      'defendant appealed.',
    human: {
      verdict: 'reversed',
      laws: ['Fourth Amendment'],
      reasoning:
        'Digital data on a modern phone is not needed to protect officer safety or prevent ' +
        'evidence destruction once the device is secured. A warrant was required; the ' +
        'warrantless search was unconstitutional and the evidence should have been suppressed.',
    },
  },
  {
    id: 'scotus-002',
    dataset: 'SCOTUS',
    jurisdiction: 'United States',
    title: 'Delgado Manufacturing v. National Labor Board',
    year: 2022,
    question:
      'Did the agency exceed its statutory authority by imposing a rule not authorized by the enabling statute?',
    facts:
      'A federal agency issued a rule requiring employers to provide a benefit that the enabling ' +
      'statute neither mentioned nor implied. The statute’s text enumerated specific powers ' +
      'and contained no general grant covering the new requirement. The agency argued the rule ' +
      'advanced the statute’s broad purpose. The court of appeals upheld the rule.',
    human: {
      verdict: 'reversed',
      laws: ['Administrative Procedure Act'],
      reasoning:
        'An agency may act only within the authority delegated by statute. Because the enabling ' +
        'act enumerated specific powers and did not authorize the new requirement, the rule ' +
        'exceeded the agency’s authority regardless of its alignment with general purposes.',
    },
  },
  {
    id: 'scotus-003',
    dataset: 'SCOTUS',
    jurisdiction: 'United States',
    title: 'Reyes v. Coastal County School District',
    year: 2020,
    question:
      'Did the school district’s discipline of a student for off-campus online speech violate the First Amendment?',
    facts:
      'A student posted, from home and outside school hours, a vulgar but non-threatening message ' +
      'criticizing the school team. The post named no individuals, contained no threats, and ' +
      'caused no demonstrated substantial disruption to school activities. The district suspended ' +
      'the student from an extracurricular team. The lower court sided with the district.',
    human: {
      verdict: 'reversed',
      laws: ['First Amendment'],
      reasoning:
        'Off-campus speech that is not threatening and does not cause a substantial disruption of ' +
        'the school environment retains First Amendment protection. The district’s interest ' +
        'did not overcome the student’s right to speak.',
    },
  },

  // ---- CaseHOLD-style (multiple-choice holding selection) ----
  {
    id: 'casehold-001',
    dataset: 'CaseHOLD',
    jurisdiction: 'United States',
    title: 'Holding selection: contract formation',
    year: 2017,
    question:
      'Which holding best completes the reasoning? An advertisement stating a price is generally treated as ___.',
    facts:
      'A retailer advertised a television at a stated price. A customer attempted to purchase at ' +
      'that price; the retailer refused, stating the item was sold out. The customer sued for ' +
      'breach, arguing the advertisement was a binding offer he had accepted.',
    options: [
      'an invitation to treat, not a binding offer, absent language of commitment',
      'a binding unilateral offer accepted by the customer’s tender of payment',
      'a firm offer irrevocable for a reasonable time under the UCC',
      'a promissory estoppel claim regardless of offer analysis',
    ],
    human: {
      verdict: 'option_0',
      laws: ['Contract law — offer and acceptance'],
      reasoning:
        'An ordinary advertisement is an invitation to treat rather than an offer, unless it ' +
        'contains clear words of commitment. The customer’s attempt to buy was itself the ' +
        'offer, which the retailer was free to decline.',
    },
  },
  {
    id: 'casehold-002',
    dataset: 'CaseHOLD',
    jurisdiction: 'United States',
    title: 'Holding selection: negligence duty',
    year: 2018,
    question:
      'Which holding best completes the reasoning? A defendant owes a duty of care where the harm was ___.',
    facts:
      'A contractor left an unmarked excavation on a pedestrian path overnight. A passerby fell ' +
      'in and was injured. The contractor argued it owed no duty because it did not know this ' +
      'particular passerby would use the path.',
    options: [
      'unforeseeable to any class of persons and therefore outside any duty',
      'a reasonably foreseeable risk to a foreseeable class of persons such as path users',
      'solely the responsibility of the municipality that owns the path',
      'barred because the passerby assumed the risk of walking at night',
    ],
    human: {
      verdict: 'option_1',
      laws: ['Tort law — duty of care'],
      reasoning:
        'Duty turns on reasonable foreseeability of harm to a foreseeable class of persons, not ' +
        'on identifying the specific victim. Pedestrians using the path were plainly foreseeable, ' +
        'so a duty arose.',
    },
  },
];

// Group cases by dataset id for the dataset registry.
export function groupByDataset() {
  const groups = new Map();
  for (const c of SAMPLE_CASES) {
    if (!groups.has(c.dataset)) groups.set(c.dataset, []);
    groups.get(c.dataset).push(c);
  }
  return groups;
}
