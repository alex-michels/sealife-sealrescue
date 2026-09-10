# Seal Run — anatomy photo references

Reviewed visually and against live species sources on **2026-09-10**. The four photographs below
were opened at full size in the browser. They inform the original canvas drawing; none is copied
into the game's assets. Atlantis uses the same harbour seal, in an explicitly fictional setting.
Search results that mixed grey/harbour seals or Baikal/ringed seals were not used for species claims.

| Species | Photograph inspected | Visual observations used | Species check |
| --- | --- | --- | --- |
| Harbour seal, *Phoca vitulina* | [Phillip Colla, underwater harbour seal #03016](https://www.oceanlight.com/log/la-jolla-seals-controversy.html), [photograph](https://www.oceanlight.com/stock-photo/harbor-seal-underwater-phoca-vitulina-photo-03016-168737.jpg) | Rounded forward muzzle, both eyes visible in a three-quarter view, small clawed foreflippers, hind feet separated behind a tapering rump. | [NOAA species profile](https://www.fisheries.noaa.gov/species/harbor-seal) |
| Ringed seal, *Pusa hispida* | [Alaska SeaLife Center](https://www.alaskasealife.org/aslc_resident_species/7), [swimming photograph](https://www.alaskasealife.org/uploads/animals/images/ringedsealswim.jpg) | Small head, forward dark eyes, pale irregular rings over a darker back, broad webbing between hindflipper digits, five visible foreflipper claws. | [NOAA species profile](https://www.fisheries.noaa.gov/species/ringed-seal) |
| Hawaiian monk seal, *Neomonachus schauinslandi* | [NOAA Earth Is Blue](https://sanctuaries.noaa.gov/magazine/4/hawaiian-monk-seal/), [underwater photograph](https://sanctuaries.noaa.gov/media/mag/4/monk-seal-below-surface-600.jpg) | Smooth, elongated torso tapering toward the paired hindflippers; short foreflippers and an eye close to the blunt muzzle. | [NOAA species profile](https://www.fisheries.noaa.gov/species/hawaiian-monk-seal) |
| Weddell seal, *Leptonychotes weddellii* | [Steve Rupp / NSF, McMurdo Sound, 2008; photograph and attribution](https://commons.wikimedia.org/wiki/File:Weddell_seal_swims_underwater_in_McMurdo_Sound_(Image_3).jpg) | Small rounded head against a substantial body, forward eyes visible in three-quarter view, irregular pale mottling and compact foreflippers. The rear is outside this frame, so this photo is not tail evidence. | [Australian Antarctic Program species profile](https://www.antarctica.gov.au/about-antarctica/animals/seals/weddell-seal/) |

Confidence is **high** for species identity and the limited visible traits above, supported by
institutional species descriptions; **medium** for translating perspective into an arcade sprite.
No exact anatomical proportions are inferred from foreshortened photographs. One visible eye in
strict side profile is normal; the revised drawing uses a slight three-quarter muzzle so the far
eye is partly visible. The near eye moves forward without relocating the nose or collision body.

The [NOAA pinniped anatomy lesson](https://www.fisheries.noaa.gov/s3/2024-09/nfs-mhs-l1-3-afsc.pdf)
is the separate source for the small tail and flipper anatomy. The tail is a short taper between
the hindflippers, with the same shading as the body and an unoutlined root. It is neither a third
flipper nor a cylindrical appendage. Hindflippers retain their articulated webbing; ear openings
remain small, with no external ear flaps. All eight frames share the same torso registration.

Generated environment pictures are decorative artwork, not anatomical or habitat evidence.
Exact prompts and delivery details are in [the asset manifest](../public/games/seal-run-v1/assets/prompts-v2.json).

## Generated predators — checked 2026-09-10

- [Australian Antarctic Program: leopard seal](https://www.antarctica.gov.au/about-antarctica/animals/seals/leopard-seal/): slender body, long foreflippers, large head and widely opening jaws with long canines. High confidence for these limited anatomical traits. The user's supplied photograph additionally guides head shape, dark dorsal coat and mottled pale underside; it is a reference, not a shipped asset.
- [American Museum of Natural History: polar bear](https://www.amnh.org/explore/ology/ology-cards/288-polar-bear?view=modal): front paws paddle and hind paws steer. High confidence for the swimming-motion choice.
- [Polar Bears International: adaptations](https://polarbearsinternational.org/polar-bears/polar-bear-facts/adaptations-characteristics/): paw and fur traits cross-check. High confidence for the large swimming paws and layered fur.

The generated four-frame cycles are game illustrations rather than measured gait studies.
The leopard seal mouth remains open to make this hazard visually distinct from the player;
this is a readability choice, not a claim about its continuous swimming behaviour.


## Regional sharks, orcas and Atlantis juvenile — checked 2026-09-10

Primary sources were opened live. **High confidence** for named species/range and the
limited diagnostic traits below; **medium confidence** for translating them into generated
four-frame illustrations. Sprites are not specimen photographs or measured gait studies.

| Region / sprite | Checked traits and source | Application / limit |
| --- | --- | --- |
| North Atlantic porbeagle, *Lamna nasus* | [COSEWIC species assessment](https://www.canada.ca/en/environment-climate-change/services/species-risk-public-registry/cosewic-assessments-status-reports/porbeagle-2014.html): dark dorsal surface, pale belly, diagnostic white patch at the **lower free rear tip** of the first dorsal fin; North Atlantic distribution. | Small hazard tier on coast/Atlantis. Rejected a generation with white on the fin apex. Contact hazard does not imply seal-specialist feeding. |
| North Atlantic white shark, *Carcharodon carcharias* | [NOAA species profile](https://www.fisheries.noaa.gov/species/white-shark): gray upper body, white underside, robust form, broad distribution including the Atlantic. | Large coast/Atlantis tier. Natural triangular teeth and gill slits; no invented polar shark encounters. |
| Hawaiian Galapagos shark, *Carcharhinus galapagensis* | [Hawaii DLNR identification guide](https://dlnr.hawaii.gov/sharks/hawaii-sharks/shark-identification-guide/): brown-gray back, white underside, dusky rather than black trailing tail edge, notably northwestern Hawaiian waters. | Small Hawaiian tier. [NOAA monk-seal survival research](https://www.fisheries.noaa.gov/pacific-islands/endangered-species-conservation/survival-research-and-enhancement-hawaiian-monk) describes concentrated pup predation at Lalo; this is not a claim that all sharks everywhere hunt seals. |
| Hawaiian tiger shark, *Galeocerdo cuvier* | [Hawaii DLNR identification guide](https://dlnr.hawaii.gov/sharks/hawaii-sharks/shark-identification-guide/): broad rounded snout; juvenile spots become stripes that fade with age; coastal and pelagic habitat. | Large Hawaiian tier with recognizable flank bars. |
| Northern/general orca, *Orcinus orca* | [NOAA killer whale profile](https://www.fisheries.noaa.gov/species/killer-whale), [NOAA illustrated type guide](https://media.fisheries.noaa.gov/2024-02/KillerWhalePoster-SWFSC-MMTD-UkoGorter-0.pdf): black/white pattern, eye patch and saddle, rounded pectorals, horizontal flukes. | Shared general female-like outline for northern waters; not labelled Pacific resident/Bigg's in the North Atlantic. The [2023 Pacific stock assessment](https://www.fisheries.noaa.gov/s3/2024-12/Pacific_SARs_Final_2023.pdf) describes orcas as rare around Hawaii; game encounter frequency is an arcade convention, not a population-density claim. |
| Antarctic orca, *Orcinus orca*, large pack-ice Type B1-inspired | [NOAA illustrated type guide](https://media.fisheries.noaa.gov/2024-02/KillerWhalePoster-SWFSC-MMTD-UkoGorter-0.pdf): larger eye patch and dorsal cape. [Australian Antarctic Program](https://www.antarctica.gov.au/about-antarctica/animals/whales/killer-whale/): Antarctic distribution and possible yellow/brown diatom staining. | Separate gray-caped, cream-patched illustration. Avoids presenting the fish-specialist Type C as the seal-predation design. |
| Atlantis young grey seal, *Halichoerus grypus* | [NOAA gray seal profile](https://www.fisheries.noaa.gov/species/gray-seal): North Atlantic species, external ear flaps absent. User photographs show round mottled juveniles and short foreflippers; the separate NOAA pinniped anatomy lesson above supports the small tail. | Four generated poses, silver/charcoal mottling, plump body, visible short triangular tail between paired hindflippers. Juvenile muzzle avoids the extreme adult-male profile. Atlantis remains explicitly fictional. |

The legacy mechanical IDs shark_white/shark_big express hazard tiers; core/fauna.js maps
them to the actual illustrated species per region. No generic sharks spawn in polar chapters.
Game contact rules, scale, repeated encounters and swim-cycle exaggeration are design choices.
