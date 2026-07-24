// retrieval/authorities.js
// The document corpus for the retrieval (RAG) test. Each authority is a legal
// source — a constitutional provision, statute, convention article, or common-law
// doctrine — described in its own neutral words (independent of any case, so the
// retriever must semantically match a question to an authority, not echo the case).
//
// The ground truth for retrieval is intrinsic to legal data: every case in
// datasets/cases.js records the authorities the court ACTUALLY cited (human.laws).
// gold.js joins those citations to entries here via `aliases`, so no hand-labeling
// of relevance is required — the court did the labeling.
//
// The corpus deliberately mixes:
//   • GOLD authorities   — cited by at least one bundled case (the answers), and
//   • DISTRACTORS        — plausible, semantically-near authorities that are NOT
//                          cited by any bundled case, so recall@k is a real test.
//
// Authority schema:
//   { id, label, type, jurisdiction, gold, aliases:[exact human.laws strings], text }

export const AUTHORITIES = [
  // ─────────────────────────── GOLD (cited by a case) ───────────────────────────

  // US Constitution / federal statutes
  {
    id: 'us-const-art3',
    label: 'U.S. Constitution, Article III',
    type: 'constitution',
    jurisdiction: 'United States',
    gold: true,
    aliases: ['U.S. Constitution, Article III'],
    text:
      'Article III vests the judicial power of the United States and fixes the ' +
      'jurisdiction of the Supreme Court, enumerating the limited categories of ' +
      'cases in which the Court has original jurisdiction and providing that in all ' +
      'other cases its jurisdiction is appellate. Congress cannot enlarge the ' +
      'Court’s original jurisdiction beyond what the Constitution specifies.',
  },
  {
    id: 'judiciary-act-1789-s13',
    label: 'Judiciary Act of 1789, §13',
    type: 'statute',
    jurisdiction: 'United States',
    gold: true,
    aliases: ['Judiciary Act of 1789, §13'],
    text:
      'The Judiciary Act of 1789 organized the federal court system. Section 13 ' +
      'addressed the Supreme Court’s power to issue writs of mandamus to officers of ' +
      'the United States, purporting to grant the Court authority to issue such writs ' +
      'as part of its original jurisdiction.',
  },
  {
    id: 'us-const-necessary-proper',
    label: 'U.S. Constitution, Necessary and Proper Clause',
    type: 'constitution',
    jurisdiction: 'United States',
    gold: true,
    aliases: ['U.S. Constitution, Necessary and Proper Clause'],
    text:
      'The Necessary and Proper Clause of Article I lets Congress make all laws ' +
      'needed to carry into execution its enumerated powers, the source of implied ' +
      'federal powers such as chartering a national bank as a means to legitimate ' +
      'constitutional ends.',
  },
  {
    id: 'us-const-supremacy',
    label: 'U.S. Constitution, Supremacy Clause',
    type: 'constitution',
    jurisdiction: 'United States',
    gold: true,
    aliases: ['Supremacy Clause'],
    text:
      'The Supremacy Clause of Article VI makes the Constitution and federal law the ' +
      'supreme law of the land, so a state may not tax, regulate, or otherwise impede ' +
      'a legitimate federal instrumentality; conflicting state law must yield.',
  },
  {
    id: 'us-const-commerce',
    label: 'U.S. Constitution, Commerce Clause',
    type: 'constitution',
    jurisdiction: 'United States',
    gold: true,
    aliases: ['U.S. Constitution, Commerce Clause'],
    text:
      'The Commerce Clause grants Congress power to regulate commerce among the ' +
      'several states, including navigation and interstate transportation. A valid ' +
      'federal licensing law regulating interstate commerce overrides a conflicting ' +
      'state-granted monopoly.',
  },
  {
    id: 'us-const-amend1',
    label: 'U.S. Constitution, First Amendment',
    type: 'constitution',
    jurisdiction: 'United States',
    gold: true,
    aliases: ['First Amendment'],
    text:
      'The First Amendment protects freedom of speech, including student expression. ' +
      'Off-campus speech that is not threatening and does not cause a substantial ' +
      'disruption of the school environment retains constitutional protection against ' +
      'government or school discipline.',
  },
  {
    id: 'us-const-amend4',
    label: 'U.S. Constitution, Fourth Amendment',
    type: 'constitution',
    jurisdiction: 'United States',
    gold: true,
    aliases: ['U.S. Constitution, Fourth Amendment', 'Fourth Amendment'],
    text:
      'The Fourth Amendment protects against unreasonable searches and seizures and ' +
      'generally requires a warrant supported by probable cause. Warrantless searches ' +
      'of a home or of digital data on a phone are presumptively unreasonable, and ' +
      'unlawfully seized evidence may be excluded.',
  },
  {
    id: 'apa',
    label: 'Administrative Procedure Act',
    type: 'statute',
    jurisdiction: 'United States',
    gold: true,
    aliases: ['Administrative Procedure Act'],
    text:
      'The Administrative Procedure Act governs how federal agencies make rules and ' +
      'take action. An agency may act only within the authority delegated to it by its ' +
      'enabling statute; a rule that exceeds the statute’s enumerated grant of power is ' +
      'invalid regardless of its alignment with broad statutory purposes.',
  },

  // European Convention on Human Rights
  {
    id: 'echr-art6',
    label: 'ECHR Article 6 § 1 — fair trial',
    type: 'convention',
    jurisdiction: 'Council of Europe',
    gold: true,
    aliases: ['Article 6 § 1'],
    text:
      'Article 6 § 1 of the European Convention guarantees the right to a fair and ' +
      'public hearing within a reasonable time by an independent tribunal. Length of ' +
      'proceedings is assessed against the complexity of the case and the conduct of ' +
      'the authorities and the applicant; delays caused by the authorities breach the ' +
      'reasonable-time requirement.',
  },
  {
    id: 'echr-art8',
    label: 'ECHR Article 8 — private and family life',
    type: 'convention',
    jurisdiction: 'Council of Europe',
    gold: true,
    aliases: ['Article 8'],
    text:
      'Article 8 protects the right to respect for private and family life. Any ' +
      'interference, such as a deportation that separates a family, must be lawful, ' +
      'pursue a legitimate aim, and be proportionate — weighing the best interests of ' +
      'children and length of residence within the State’s margin of appreciation.',
  },
  {
    id: 'echr-art11',
    label: 'ECHR Article 11 — freedom of assembly',
    type: 'convention',
    jurisdiction: 'Council of Europe',
    gold: true,
    aliases: ['Article 11'],
    text:
      'Article 11 guarantees freedom of peaceful assembly and association. A ban on a ' +
      'peaceful demonstration must be necessary in a democratic society; a blanket ' +
      'prohibition applied without any individualized proportionality assessment or ' +
      'consideration of less restrictive measures violates the right.',
  },

  // Common-law doctrines
  {
    id: 'doctrine-offer-acceptance',
    label: 'Contract — offer and acceptance',
    type: 'doctrine',
    jurisdiction: 'Common law',
    gold: true,
    aliases: [
      'Contract law — unilateral offer and acceptance',
      'Contract law — offer and acceptance',
    ],
    text:
      'A contract requires an offer accepted on its terms, supported by consideration. ' +
      'An ordinary advertisement is usually an invitation to treat rather than an offer, ' +
      'but an advertisement promising a reward for performing specified conditions can ' +
      'be a unilateral offer to the world, accepted by performing those conditions.',
  },
  {
    id: 'doctrine-negligence-duty',
    label: 'Tort — negligence and duty of care',
    type: 'doctrine',
    jurisdiction: 'Common law',
    gold: true,
    aliases: [
      'Tort law — negligence, duty of care (neighbour principle)',
      'Tort law — duty of care',
    ],
    text:
      'In negligence, a defendant owes a duty of care to persons who are so closely and ' +
      'directly affected by the act that they ought reasonably to be in contemplation — ' +
      'the neighbour principle. Duty turns on the reasonable foreseeability of harm to a ' +
      'foreseeable class of persons and does not depend on any contract between the parties.',
  },
  {
    id: 'doctrine-strict-liability-escape',
    label: 'Tort — strict liability for escape (Rylands v Fletcher)',
    type: 'doctrine',
    jurisdiction: 'Common law',
    gold: true,
    aliases: ['Tort law — strict liability for escape (non-natural use of land)'],
    text:
      'A person who, for their own purposes, brings onto their land and keeps there ' +
      'something likely to do mischief if it escapes, keeps it at their peril and is ' +
      'strictly liable for the natural consequences of its escape, regardless of ' +
      'negligence, where the use of the land was non-natural.',
  },
  {
    id: 'doctrine-remoteness',
    label: 'Contract — remoteness of damage (Hadley v Baxendale)',
    type: 'doctrine',
    jurisdiction: 'Common law',
    gold: true,
    aliases: ['Contract law — remoteness of damage'],
    text:
      'Damages for breach of contract are limited to losses arising naturally from the ' +
      'breach or those in the reasonable contemplation of both parties when the contract ' +
      'was made. Special losses, such as lost profits from a stoppage, are recoverable ' +
      'only if the special circumstances were communicated; otherwise they are too remote.',
  },

  // ──────────────────────── DISTRACTORS (never cited here) ───────────────────────
  // Plausible, topically-near authorities that make retrieval non-trivial.
  {
    id: 'us-const-amend5',
    label: 'U.S. Constitution, Fifth Amendment',
    type: 'constitution',
    jurisdiction: 'United States',
    gold: false,
    aliases: [],
    text:
      'The Fifth Amendment guarantees the right against compelled self-incrimination, ' +
      'the right to due process of law, protection against double jeopardy, and just ' +
      'compensation when private property is taken for public use.',
  },
  {
    id: 'us-const-amend6',
    label: 'U.S. Constitution, Sixth Amendment',
    type: 'constitution',
    jurisdiction: 'United States',
    gold: false,
    aliases: [],
    text:
      'The Sixth Amendment guarantees the accused in a criminal prosecution the right ' +
      'to a speedy and public trial, an impartial jury, notice of the accusation, ' +
      'confrontation of witnesses, and the assistance of counsel for the defense.',
  },
  {
    id: 'us-const-amend10',
    label: 'U.S. Constitution, Tenth Amendment',
    type: 'constitution',
    jurisdiction: 'United States',
    gold: false,
    aliases: [],
    text:
      'The Tenth Amendment reserves to the states, or to the people, the powers not ' +
      'delegated to the federal government by the Constitution, and is invoked in ' +
      'disputes over the balance of state and federal sovereignty.',
  },
  {
    id: 'us-const-amend14',
    label: 'U.S. Constitution, Fourteenth Amendment',
    type: 'constitution',
    jurisdiction: 'United States',
    gold: false,
    aliases: [],
    text:
      'The Fourteenth Amendment guarantees equal protection of the laws and due ' +
      'process against state action, and is the vehicle by which many federal ' +
      'constitutional protections are applied to the states.',
  },
  {
    id: 'us-const-art1',
    label: 'U.S. Constitution, Article I',
    type: 'constitution',
    jurisdiction: 'United States',
    gold: false,
    aliases: [],
    text:
      'Article I vests legislative power in Congress and enumerates its powers, ' +
      'including taxation, borrowing, and the general structure of the legislative ' +
      'branch and the process by which bills become law.',
  },
  {
    id: 'chevron-deference',
    label: 'Chevron deference doctrine',
    type: 'doctrine',
    jurisdiction: 'United States',
    gold: false,
    aliases: [],
    text:
      'Under the Chevron doctrine, courts historically deferred to a federal agency’s ' +
      'reasonable interpretation of an ambiguous statute the agency administers, asking ' +
      'first whether Congress spoke directly to the issue and, if not, whether the ' +
      'agency’s construction was permissible.',
  },
  {
    id: 'exclusionary-rule',
    label: 'Exclusionary rule',
    type: 'doctrine',
    jurisdiction: 'United States',
    gold: false,
    aliases: [],
    text:
      'The exclusionary rule bars the use at trial of evidence obtained in violation of ' +
      'a defendant’s constitutional rights, and has various exceptions such as good ' +
      'faith, inevitable discovery, and independent source.',
  },
  {
    id: 'echr-art5',
    label: 'ECHR Article 5 — liberty and security',
    type: 'convention',
    jurisdiction: 'Council of Europe',
    gold: false,
    aliases: [],
    text:
      'Article 5 protects the right to liberty and security of person, permitting ' +
      'deprivation of liberty only in enumerated circumstances and according to a ' +
      'procedure prescribed by law, with a right to challenge detention speedily.',
  },
  {
    id: 'echr-art10',
    label: 'ECHR Article 10 — freedom of expression',
    type: 'convention',
    jurisdiction: 'Council of Europe',
    gold: false,
    aliases: [],
    text:
      'Article 10 protects freedom of expression, including the freedom to hold ' +
      'opinions and to receive and impart information and ideas. Restrictions must be ' +
      'prescribed by law, pursue a legitimate aim, and be necessary in a democratic society.',
  },
  {
    id: 'echr-art14',
    label: 'ECHR Article 14 — non-discrimination',
    type: 'convention',
    jurisdiction: 'Council of Europe',
    gold: false,
    aliases: [],
    text:
      'Article 14 prohibits discrimination in the enjoyment of Convention rights on any ' +
      'ground such as sex, race, religion, political opinion, national origin, or other status.',
  },
  {
    id: 'doctrine-consideration',
    label: 'Contract — consideration',
    type: 'doctrine',
    jurisdiction: 'Common law',
    gold: false,
    aliases: [],
    text:
      'Consideration is the requirement that each party to a contract give something of ' +
      'value — a benefit or detriment bargained for in exchange — for a promise to be ' +
      'enforceable. Past consideration and pre-existing duties generally do not suffice.',
  },
  {
    id: 'doctrine-frustration',
    label: 'Contract — frustration',
    type: 'doctrine',
    jurisdiction: 'Common law',
    gold: false,
    aliases: [],
    text:
      'Frustration discharges a contract when an unforeseen event, without the fault of ' +
      'either party, makes performance impossible or radically different from what was ' +
      'undertaken, so that it would be unjust to hold the parties to their bargain.',
  },
  {
    id: 'doctrine-vicarious-liability',
    label: 'Tort — vicarious liability',
    type: 'doctrine',
    jurisdiction: 'Common law',
    gold: false,
    aliases: [],
    text:
      'Vicarious liability holds an employer responsible for torts committed by an ' +
      'employee in the course of employment, where there is a sufficiently close ' +
      'connection between the wrongful act and the work the employee was engaged to do.',
  },
  {
    id: 'doctrine-causation',
    label: 'Tort — causation and remoteness',
    type: 'doctrine',
    jurisdiction: 'Common law',
    gold: false,
    aliases: [],
    text:
      'A claimant in negligence must show the breach caused the damage in fact (the ' +
      '“but for” test) and that the damage was not too remote — that is, of a kind that ' +
      'was reasonably foreseeable as a consequence of the breach.',
  },
];

// Fast lookup by id.
export const AUTHORITY_BY_ID = new Map(AUTHORITIES.map((a) => [a.id, a]));

export const GOLD_AUTHORITIES = AUTHORITIES.filter((a) => a.gold);
export const DISTRACTORS = AUTHORITIES.filter((a) => !a.gold);
