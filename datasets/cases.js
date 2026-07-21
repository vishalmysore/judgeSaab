// datasets/cases.js
// Bundled cases. Two kinds:
//   1. REAL, PUBLIC-DOMAIN landmark cases (see REAL_CASES) — court opinions are
//      not copyrightable, and these decisions are centuries/decades old and
//      fully in the public domain. Facts and holdings are summarized here in our
//      own neutral words; each case links to the actual judgment (Justia / BAILII).
//   2. ORIGINAL SYNTHETIC scenarios written in the style of named corpora
//      (ECtHR, SCOTUS, CaseHOLD) for additional coverage — clearly labelled as
//      illustrative and not real cases.
//
// Case schema:
//   { id, dataset, jurisdiction, title, year, question, facts, options?,
//     human: { verdict, laws:[], reasoning }, source?: { label, url } }
//
// verdict vocab is per-dataset; the evaluation engine maps to a canonical label.

// ── Real, public-domain landmark cases (with links to the actual judgment) ──
export const REAL_CASES = [
  // ---- US Supreme Court (public domain; Justia) ----
  {
    id: 'scotus-marbury-1803',
    dataset: 'SCOTUS-Classic',
    jurisdiction: 'United States',
    title: 'Marbury v. Madison',
    year: 1803,
    question:
      'Was §13 of the Judiciary Act of 1789 — purporting to give the Supreme Court original jurisdiction to issue writs of mandamus — consistent with Article III of the Constitution? (answer: constitutional or unconstitutional)',
    facts:
      'In the final days of the Adams administration, William Marbury was appointed a justice of the ' +
      'peace, but his signed commission was never delivered. When the new Secretary of State, James ' +
      'Madison, withheld it, Marbury petitioned the Supreme Court directly for a writ of mandamus ' +
      'ordering delivery, relying on a section of the Judiciary Act of 1789 that purported to grant the ' +
      'Court original jurisdiction to issue such writs. Article III of the Constitution specifies the ' +
      'Court’s original jurisdiction and does not include such cases.',
    human: {
      verdict: 'unconstitutional',
      laws: ['U.S. Constitution, Article III', 'Judiciary Act of 1789, §13'],
      reasoning:
        'Although Marbury had a legal right to his commission, the Court could not grant the remedy: ' +
        'the statutory provision purporting to expand the Court’s original jurisdiction conflicted with ' +
        'Article III and was void. A law repugnant to the Constitution is invalid, and it is the ' +
        'province of the courts to say what the law is — establishing judicial review.',
    },
    source: { label: 'Marbury v. Madison, 5 U.S. 137 (1803) — Justia', url: 'https://supreme.justia.com/cases/federal/us/5/137/' },
  },
  {
    id: 'scotus-mcculloch-1819',
    dataset: 'SCOTUS-Classic',
    jurisdiction: 'United States',
    title: 'McCulloch v. Maryland',
    year: 1819,
    question:
      'Could the State of Maryland levy a tax on the federally chartered Bank of the United States? (answer: constitutional or unconstitutional)',
    facts:
      'Congress chartered the Second Bank of the United States and opened a branch in Maryland. Maryland ' +
      'enacted a tax on banks not chartered by the state, aimed at the federal branch. James McCulloch, ' +
      'the branch cashier, refused to pay. Maryland argued the Constitution nowhere expressly authorizes ' +
      'Congress to charter a bank, and that a state may tax activities within its borders.',
    human: {
      verdict: 'unconstitutional',
      laws: ['U.S. Constitution, Necessary and Proper Clause', 'Supremacy Clause'],
      reasoning:
        'Congress possessed implied power under the Necessary and Proper Clause to charter the Bank as a ' +
        'means to legitimate constitutional ends. Because the power to tax involves the power to destroy, ' +
        'a state could not tax a federal instrumentality; the Supremacy Clause barred Maryland’s tax, ' +
        'which was therefore unconstitutional.',
    },
    source: { label: 'McCulloch v. Maryland, 17 U.S. 316 (1819) — Justia', url: 'https://supreme.justia.com/cases/federal/us/17/316/' },
  },
  {
    id: 'scotus-gibbons-1824',
    dataset: 'SCOTUS-Classic',
    jurisdiction: 'United States',
    title: 'Gibbons v. Ogden',
    year: 1824,
    question:
      'Did a New York steamboat monopoly yield to a federal coasting license under the Commerce Clause? (answer: affirmed or reversed)',
    facts:
      'New York granted an exclusive monopoly to operate steamboats in its waters, which Ogden held. ' +
      'Gibbons ran competing steamboats between New Jersey and New York under a license granted by ' +
      'federal coasting law. Ogden obtained an injunction under the state monopoly; Gibbons argued the ' +
      'federal license controlled interstate navigation.',
    human: {
      verdict: 'reversed',
      laws: ['U.S. Constitution, Commerce Clause'],
      reasoning:
        'The commerce power extends to navigation and to commerce among the states, and a valid federal ' +
        'licensing law overrides a conflicting state grant. The New York monopoly could not stand against ' +
        'Gibbons’s federal coasting license; the injunction was reversed.',
    },
    source: { label: 'Gibbons v. Ogden, 22 U.S. 1 (1824) — Justia', url: 'https://supreme.justia.com/cases/federal/us/22/1/' },
  },
  {
    id: 'scotus-weeks-1914',
    dataset: 'SCOTUS-Classic',
    jurisdiction: 'United States',
    title: 'Weeks v. United States',
    year: 1914,
    question:
      'Must evidence that federal officers seized from the defendant’s home without a warrant be excluded from his trial? (answer: affirmed or reversed)',
    facts:
      'Federal officers, without a search warrant, entered Weeks’s home and seized private papers later ' +
      'used to convict him of using the mails for illegal lottery tickets. Weeks moved for the return of ' +
      'his property and to exclude the evidence, arguing the warrantless seizure violated the Fourth ' +
      'Amendment.',
    human: {
      verdict: 'reversed',
      laws: ['U.S. Constitution, Fourth Amendment'],
      reasoning:
        'The warrantless seizure of papers from a private home violated the Fourth Amendment, and allowing ' +
        'their use at trial would render the constitutional protection meaningless. The evidence had to be ' +
        'excluded — establishing the federal exclusionary rule — and the conviction was reversed.',
    },
    source: { label: 'Weeks v. United States, 232 U.S. 383 (1914) — Justia', url: 'https://supreme.justia.com/cases/federal/us/232/383/' },
  },

  // ---- English common law (public domain; BAILII) ----
  {
    id: 'commonlaw-carlill-1892',
    dataset: 'CommonLaw',
    jurisdiction: 'United Kingdom',
    title: 'Carlill v Carbolic Smoke Ball Co',
    year: 1892,
    question:
      'Was there a binding contract entitling Mrs Carlill to the advertised £100 reward? (answer: binding contract or no contract)',
    facts:
      'The Carbolic Smoke Ball Company advertised that it would pay £100 to anyone who used its smoke ball ' +
      'as directed and still caught influenza, adding that it had deposited £1,000 with a bank to show its ' +
      'sincerity. Mrs Carlill bought and used the ball as directed, then caught influenza. The company ' +
      'argued its advertisement was mere puff and too vague to be a contractual offer.',
    human: {
      verdict: 'binding contract',
      laws: ['Contract law — unilateral offer and acceptance'],
      reasoning:
        'The advertisement was a unilateral offer to the world, its seriousness confirmed by the bank ' +
        'deposit; Mrs Carlill accepted by performing the specified conditions, and her use supplied ' +
        'consideration. A binding contract was formed and the £100 was payable.',
    },
    source: { label: 'Carlill v Carbolic Smoke Ball Co [1892] EWCA Civ 1 — BAILII', url: 'https://www.bailii.org/ew/cases/EWCA/Civ/1892/1.html' },
  },
  {
    id: 'commonlaw-donoghue-1932',
    dataset: 'CommonLaw',
    jurisdiction: 'United Kingdom',
    title: 'Donoghue v Stevenson',
    year: 1932,
    question:
      'Did the ginger-beer manufacturer owe a duty of care to the consumer who did not buy the drink? (answer: liable or not liable)',
    facts:
      'Mrs Donoghue drank ginger beer bought for her by a friend from a café; the opaque bottle, ' +
      'manufactured by Stevenson, contained the decomposed remains of a snail, and she fell ill. She had ' +
      'no contract with the manufacturer or the café owner, so she sued the manufacturer in negligence. ' +
      'The manufacturer argued it owed no duty to someone with whom it had no contract.',
    human: {
      verdict: 'liable',
      laws: ['Tort law — negligence, duty of care (neighbour principle)'],
      reasoning:
        'A manufacturer of products it intends to reach the consumer in the form they left it, with no ' +
        'reasonable possibility of intermediate examination, owes that consumer a duty to take reasonable ' +
        'care. Liability in negligence does not depend on a contract; the manufacturer owed and breached a ' +
        'duty of care.',
    },
    source: { label: 'Donoghue v Stevenson [1932] UKHL 100 — BAILII', url: 'https://www.bailii.org/uk/cases/UKHL/1932/100.html' },
  },
  {
    id: 'commonlaw-rylands-1868',
    dataset: 'CommonLaw',
    jurisdiction: 'United Kingdom',
    title: 'Rylands v Fletcher',
    year: 1868,
    question:
      'Was the defendant liable, without proof of negligence, when water from his reservoir escaped and flooded the neighbouring mine? (answer: liable or not liable)',
    facts:
      'The defendants built a reservoir on their land to supply their mill. Water broke through disused ' +
      'mine shafts beneath the site and flooded the plaintiff’s adjoining coal mine. The plaintiff could ' +
      'not show the defendants were negligent; the question was whether liability could arise from the ' +
      'escape itself.',
    human: {
      verdict: 'liable',
      laws: ['Tort law — strict liability for escape (non-natural use of land)'],
      reasoning:
        'A person who, for his own purposes, brings and keeps on his land something likely to do mischief ' +
        'if it escapes, keeps it at his peril and is liable for the natural consequences of its escape, ' +
        'regardless of negligence. The non-natural use and escape made the defendants strictly liable.',
    },
    source: { label: 'Rylands v Fletcher [1868] UKHL 1 — BAILII', url: 'https://www.bailii.org/uk/cases/UKHL/1868/1.html' },
  },
  {
    id: 'commonlaw-hadley-1854',
    dataset: 'CommonLaw',
    jurisdiction: 'United Kingdom',
    title: 'Hadley v Baxendale',
    year: 1854,
    question:
      'Were the mill’s lost profits recoverable as damages for the carrier’s delay in delivering a broken crankshaft? (answer: recoverable or not recoverable)',
    facts:
      'A mill’s crankshaft broke, and the owners engaged Baxendale to carry the broken shaft to engineers ' +
      'as a pattern for a replacement. Delivery was delayed and the mill stood idle longer than it would ' +
      'have, so the owners claimed their lost profits. They had not told the carrier that the mill would be ' +
      'wholly stopped until the new shaft arrived.',
    human: {
      verdict: 'not recoverable',
      laws: ['Contract law — remoteness of damage'],
      reasoning:
        'Damages for breach are limited to losses arising naturally from the breach or those in the ' +
        'reasonable contemplation of both parties when contracting. The special loss of profits was not ' +
        'communicated and not reasonably foreseeable to the carrier, so it was too remote and not recoverable.',
    },
    source: { label: 'Hadley v Baxendale [1854] EWHC J70 — BAILII', url: 'https://www.bailii.org/ew/cases/EWHC/Exch/1854/J70.html' },
  },
];

export const SYNTHETIC_CASES = [
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

// Real public-domain cases first, so they lead the dataset dropdown.
export const SAMPLE_CASES = [...REAL_CASES, ...SYNTHETIC_CASES];

// Group cases by dataset id for the dataset registry.
export function groupByDataset() {
  const groups = new Map();
  for (const c of SAMPLE_CASES) {
    if (!groups.has(c.dataset)) groups.set(c.dataset, []);
    groups.get(c.dataset).push(c);
  }
  return groups;
}
