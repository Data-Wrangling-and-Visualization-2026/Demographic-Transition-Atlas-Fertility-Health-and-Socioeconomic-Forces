# Event Taxonomy for Fertility-Related Policy Sources

This document defines the canonical taxonomy for the unified policy/event layer stored in `fact_context_event`.

## 1. Goal

The purpose of this taxonomy is to map heterogeneous policy sources (UN World Population Policies Database and IRPD) into one consistent event structure for querying, filtering, and visualization.

Each event in `fact_context_event` should use:
- one canonical `event_category`
- one optional `event_subtype`
- one `policy_direction`
- one normalized human-readable `title`

---

## 2. Canonical event categories

Allowed `event_category` values:

- `family_planning`
- `contraception`
- `abortion`
- `reproductive_health`
- `maternal_care`
- `assisted_reproduction`
- `parental_leave`
- `childcare_support`
- `population_policy`
- `sex_education`
- `gender_reproductive_rights`

### Category meanings

#### `family_planning`
Government support, access, or official position on family planning policies and programs.

#### `contraception`
Access to contraceptive methods, legal status, affordability, and public support.

#### `abortion`
Legal restrictions, liberalization, procedural access, or policy changes related to abortion.

#### `reproductive_health`
Broad reproductive health policy, reproductive services, and system-level access.

#### `maternal_care`
Pregnancy care, maternal care access, prenatal/postnatal policy support.

#### `assisted_reproduction`
Policies related to ART/IVF and other medically assisted reproduction services.

#### `parental_leave`
Leave policies related to childbirth, parents, and childbearing support.

#### `childcare_support`
Public childcare, childcare affordability, institutional support for raising children.

#### `population_policy`
High-level state orientation toward fertility/population growth/decline.

#### `sex_education`
School-based or public sex education policy.

#### `gender_reproductive_rights`
Rights-based policy changes affecting reproductive autonomy and gender-linked access.

---

## 3. Canonical policy directions

Allowed `policy_direction` values:

- `expansive`
- `restrictive`
- `pro_natal`
- `anti_natal`
- `neutral`
- `unknown`

### Direction meanings

#### `expansive`
Policy expanded access, coverage, rights, or public support.

#### `restrictive`
Policy reduced access, tightened legal conditions, or added constraints.

#### `pro_natal`
Policy explicitly encourages births or family formation.

#### `anti_natal`
Policy explicitly discourages births or promotes fertility reduction.

#### `neutral`
Policy changed administratively or descriptively without a clear direction.

#### `unknown`
Direction cannot be inferred reliably from the source.

---

## 4. Event title rules

Titles must be:
- short
- human-readable
- source-agnostic
- suitable for frontend cards/tooltips

Preferred templates:

- `Family planning policy expanded`
- `Family planning policy became more restrictive`
- `Abortion policy expanded`
- `Abortion policy became more restrictive`
- `Contraception access expanded`
- `Reproductive health policy updated`
- `Maternal care support expanded`
- `Assisted reproduction policy updated`
- `Population policy orientation changed`
- `Parental leave policy expanded`
- `Childcare support policy expanded`
- `Sex education policy updated`

Avoid:
- raw source field names
- unclear abbreviations
- titles longer than one short sentence

---

## 5. Mapping rules for UN WPP

UN WPP records should be mapped into the canonical categories based on policy topic.

Recommended mapping examples:

- family planning support -> `family_planning`
- fertility reduction / fertility increase orientation -> `population_policy`
- abortion policy -> `abortion`
- reproductive health policy -> `reproductive_health`
- maternal health / maternal care -> `maternal_care`
- contraception access/support -> `contraception`

If a UN WPP variable describes overall government stance toward fertility:
- use `population_policy`
- use `policy_direction = pro_natal | anti_natal | neutral | unknown`

If a UN WPP variable describes policy access or restriction:
- use the corresponding domain category
- use `policy_direction = expansive | restrictive | neutral | unknown`

---

## 6. Mapping rules for IRPD

Recommended mapping from IRPD dimensions:

- sex education -> `sex_education`
- contraception -> `contraception`
- abortion -> `abortion`
- assisted reproductive technologies -> `assisted_reproduction`
- pregnancy care -> `maternal_care`

Direction mapping for IRPD:
- broader access / legalization / public support -> `expansive`
- tighter legal conditions / reduced access -> `restrictive`
- unclear change -> `unknown`

---

## 7. Event subtype rules

`event_subtype` is optional and can preserve more detailed source meaning.

Examples:
- `legalization`
- `restriction`
- `public_funding`
- `service_access`
- `eligibility_change`
- `government_support`
- `official_orientation`
- `rights_expansion`
- `rights_restriction`

Use subtype only if it adds useful meaning beyond `event_category`.

---

## 8. Summary and mechanism rules

`summary`:
- 1-2 sentences
- describes what changed

`mechanism`:
- 1 sentence
- explains why this might matter for fertility/reproductive outcomes

Important:
Do not claim direct causality unless the source explicitly supports it.
Use phrasing such as:
- `may affect`
- `may influence`
- `can change access to`
- `can alter timing of births`

---

## 9. Examples

### Example 1
Source: IRPD
Topic: abortion
Direction: access reduced

Mapped event:
- `event_category = abortion`
- `event_subtype = rights_restriction`
- `policy_direction = restrictive`
- `title = Abortion policy became more restrictive`

### Example 2
Source: UN WPP
Topic: government support for family planning increased

Mapped event:
- `event_category = family_planning`
- `event_subtype = government_support`
- `policy_direction = expansive`
- `title = Family planning policy expanded`

### Example 3
Source: UN WPP
Topic: state policy shifted toward encouraging births

Mapped event:
- `event_category = population_policy`
- `event_subtype = official_orientation`
- `policy_direction = pro_natal`
- `title = Population policy orientation changed`