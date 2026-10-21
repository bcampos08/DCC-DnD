// Loot Box Forge engine, ported from the Loot Box Forge app.
// Item data and roll rules are unchanged; only storage and UI code were removed.
/* eslint-disable */
/* ======================= DATA ======================= */
// name|rarity|category|tags|value|description
// rarity: M mundane, C common, U uncommon, R rare, V very rare, L legendary, A artifact
const RAW = `
Club|M|wpn|m,bw||1d4 bludgeoning. Light. 1 sp.
Dagger|M|wpn|m,fin||1d4 piercing. Finesse, light, thrown (20/60). 2 gp.
Greatclub|M|wpn|m,bw||1d8 bludgeoning. Two-handed. 2 sp.
Handaxe|M|wpn|m||1d6 slashing. Light, thrown (20/60). 5 gp.
Javelin|M|wpn|m|q:1d4|1d6 piercing. Thrown (30/120). 5 sp each.
Light Hammer|M|wpn|m||1d4 bludgeoning. Light, thrown (20/60). 2 gp.
Mace|M|wpn|m||1d6 bludgeoning. 5 gp.
Quarterstaff|M|wpn|m,bw,pc||1d6 bludgeoning. Versatile (1d8). 2 sp.
Sickle|M|wpn|m,fin||1d4 slashing. Light. 1 gp.
Spear|M|wpn|m||1d6 piercing. Thrown (20/60), versatile (1d8). 1 gp.
Battleaxe|M|wpn|m||1d8 slashing. Versatile (1d10). 10 gp.
Flail|M|wpn|m||1d8 bludgeoning. 10 gp.
Glaive|M|wpn|m||1d10 slashing. Heavy, reach, two-handed. 20 gp.
Greataxe|M|wpn|m||1d12 slashing. Heavy, two-handed. 30 gp.
Greatsword|M|wpn|m||2d6 slashing. Heavy, two-handed. 50 gp.
Halberd|M|wpn|m||1d10 slashing. Heavy, reach, two-handed. 20 gp.
Lance|M|wpn|m||1d12 piercing. Reach; two hands unless mounted. 10 gp.
Longsword|M|wpn|m||1d8 slashing. Versatile (1d10). 15 gp.
Maul|M|wpn|m,bw||2d6 bludgeoning. Heavy, two-handed. 10 gp.
Morningstar|M|wpn|m||1d8 piercing. 15 gp.
Pike|M|wpn|m||1d10 piercing. Heavy, reach, two-handed. 5 gp.
Rapier|M|wpn|m,fin||1d8 piercing. Finesse. 25 gp.
Scimitar|M|wpn|m,fin||1d6 slashing. Finesse, light. 25 gp.
Shortsword|M|wpn|m,fin||1d6 piercing. Finesse, light. 10 gp.
Trident|M|wpn|m||1d6 piercing. Thrown (20/60), versatile (1d8). 5 gp.
War Pick|M|wpn|m||1d8 piercing. 5 gp.
Warhammer|M|wpn|m||1d8 bludgeoning. Versatile (1d10). 15 gp.
Whip|M|wpn|m,fin||1d4 slashing. Finesse, reach. 2 gp.
Light Crossbow|M|wpn|r||1d8 piercing. Range 80/320, loading, two-handed. 25 gp.
Darts|M|wpn|r,fin|q:2d6|1d4 piercing each. Finesse, thrown (20/60). 5 cp each.
Shortbow|M|wpn|r||1d6 piercing. Range 80/320, two-handed. 25 gp.
Sling|M|wpn|r||1d4 bludgeoning. Range 30/120. 1 sp.
Blowgun|M|wpn|r,fin,st||1 piercing. Range 25/100, loading. Made for poisoned needles. 10 gp.
Hand Crossbow|M|wpn|r,fin||1d6 piercing. Range 30/120, light, loading. 75 gp.
Heavy Crossbow|M|wpn|r||1d10 piercing. Range 100/400, heavy, loading, two-handed. 50 gp.
Longbow|M|wpn|r||1d8 piercing. Range 150/600, heavy, two-handed. 50 gp.
Net|M|wpn|bt,pc||Thrown (5/15). Restrains a Large or smaller creature; DC 10 Strength to escape. 1 gp.
Arrows|M|ammo||q:20|Standard arrows. 1 gp per 20.
Crossbow Bolts|M|ammo||q:20|Standard bolts. 1 gp per 20.
Sling Bullets|M|ammo||q:20|Lead shot. 4 cp per 20.
Blowgun Needles|M|ammo|st|q:50|Thin needles that hold poison well. 1 gp per 50.
Padded Armor|M|armor|ap||Light armor, AC 11 + Dex. Disadvantage on Stealth. 5 gp.
Leather Armor|M|armor|ap,st||Light armor, AC 11 + Dex. 10 gp.
Studded Leather Armor|M|armor|ap,st||Light armor, AC 12 + Dex. 45 gp.
Hide Armor|M|armor|ap||Medium armor, AC 12 + Dex (max 2). 10 gp.
Chain Shirt|M|armor|ap||Medium armor, AC 13 + Dex (max 2). 50 gp.
Scale Mail|M|armor|ap||Medium armor, AC 14 + Dex (max 2). Disadvantage on Stealth. 50 gp.
Breastplate|M|armor|ap||Medium armor, AC 14 + Dex (max 2). 400 gp.
Half Plate|M|armor|ap||Medium armor, AC 15 + Dex (max 2). Disadvantage on Stealth. 750 gp.
Ring Mail|M|armor|ap||Heavy armor, AC 14. Disadvantage on Stealth. 30 gp.
Chain Mail|M|armor|ap||Heavy armor, AC 16, Str 13. Disadvantage on Stealth. 75 gp.
Splint Armor|M|armor|ap||Heavy armor, AC 17, Str 15. Disadvantage on Stealth. 200 gp.
Plate Armor|U|armor|ap||Heavy armor, AC 18, Str 15. Disadvantage on Stealth. 1,500 gp.
Shield|M|shield|cb||+2 AC. 10 gp.
Backpack|M|gear|ut,qs||Holds 1 cubic foot or 30 lb of gear. 2 gp.
Bedroll|M|gear|qs||A warm roll of blankets. 1 gp.
Hempen Rope (50 ft)|M|gear|ut,qs,bt||2 hit points; DC 17 Strength to burst. 1 gp.
Silk Rope (50 ft)|M|gear|ut,qs,st||Half the weight of hemp rope. 10 gp.
Grappling Hook|M|gear|ut,qs,st||Tie it to a rope and throw. 2 gp.
Crowbar|M|gear|ut,st||Advantage on Strength checks where leverage helps. 2 gp.
Pitons|M|gear|qs|q:10|Iron spikes for climbing and anchoring. 5 cp each.
Torches|M|gear|ut,qs|q:10|Each burns for an hour, bright light 20 ft. 1 cp each.
Tinderbox|M|gear|ut||Flint, steel and tinder. 5 sp.
Hooded Lantern|M|gear|ut,qs,st||Bright light 30 ft; can be hooded to dim light. 5 gp.
Bullseye Lantern|M|gear|ut,dt||Bright light in a 60-foot cone. 10 gp.
Oil|M|gear|ex,cbp,ut|q:1d4|Throw to splash, then set it alight for 5 fire damage. 1 sp a flask.
Rations (5 days)|M|gear|qs||Dried food for travel. 2 sp.
Waterskin|M|gear|qs||Holds 4 pints. 2 sp.
Healer's Kit|M|gear|hl,pc,cbp||10 uses. Stabilize a dying creature without a check. 5 gp.
Climber's Kit|M|gear|qs,st||Pitons, boot tips, gloves and harness. 25 gp.
Manacles|M|gear|bt||DC 20 Dexterity to slip free, DC 20 Strength to break. 2 gp.
Chain (10 ft)|M|gear|bt,bw||10 hit points; DC 20 Strength to burst. 5 gp.
Lock|M|gear|ut,bt||Comes with a key. DC 15 to pick. 10 gp.
Spyglass|U|gear|dt,qs,bt||Objects look twice as large. 1,000 gp.
Magnifying Glass|C|gear|dt,cr||Advantage on appraising or inspecting small details. 100 gp.
Hourglass|M|gear|ut||Counts an hour of sand. 25 gp.
Map Case|M|gear|qs||A leather tube for maps and scrolls. 1 gp.
Ink and Pen|M|gear|qs,cr||A bottle of ink and a quill. 10 gp.
Ball Bearings (bag of 1,000)|M|gear|st,ut||Cover a 10-ft square; DC 10 Dexterity or fall prone. 1 gp.
Caltrops (bag of 20)|M|gear|st,ut||Cover a 5-ft square; 1 piercing and slowed. 1 gp.
Hunting Trap|M|gear|bt,pt||DC 13 Dexterity or 1d4 piercing and stuck. 5 gp.
Steel Mirror|M|gear|ut,st||Handy for peeking around corners. 5 gp.
Antitoxin|M|gear|hl,cbp||Advantage on saves against poison for 1 hour. 50 gp.
Holy Water|M|gear|cbp,ex||Thrown: 2d6 radiant to a fiend or undead. 25 gp.
Component Pouch|M|gear|ut||Holds the material components for spells. 25 gp.
Two-Person Tent|M|gear|qs||A simple portable shelter. 2 gp.
Fishing Tackle|M|gear|qs,pc||Rod, line, floats and hooks. 1 gp.
Book of Lore|M|gear|pc,qs||A bound volume of poetry, history or local lore. 25 gp.
Chalk|M|gear|ut,cr|q:10|Mark your path. 1 cp each.
Signet Ring|M|gear|qs||Seals letters with a family crest. 5 gp.
Perfume|M|gear|pc||A small vial of something lovely. 5 gp.
Disguise Kit|M|tool|st||Cosmetics, hair dye and small props. 25 gp.
Forgery Kit|M|tool|st,cr||Papers, inks and seals for copying documents. 15 gp.
Thieves' Tools|M|tool|st||Picks, a file, a mirror and pliers. 25 gp.
Herbalism Kit|M|tool|hl,cr,pc||Make antitoxin and potions of healing. 5 gp.
Poisoner's Kit|M|tool|st,cr||Vials, chemicals and gear for brewing poison. 50 gp.
Navigator's Tools|M|tool|qs||Sextant, compass and charts. 25 gp.
Cartographer's Tools|M|tool|qs,cr||Quill, ink, parchment and measuring tools. 15 gp.
Alchemist's Supplies|M|tool|cr,ex||Beakers, burners and reagents. 50 gp.
Brewer's Supplies|M|tool|cr||For brewing beer and ale. 20 gp.
Calligrapher's Supplies|M|tool|cr||Fine inks and pens. 10 gp.
Carpenter's Tools|M|tool|cr||Saw, hammer, nails, plane. 8 gp.
Cobbler's Tools|M|tool|cr||For making and mending shoes. 5 gp.
Cook's Utensils|M|tool|cr,pc||Pots, knives and spoons. 1 gp.
Glassblower's Tools|M|tool|cr||Blowpipe and shaping tools. 30 gp.
Jeweler's Tools|M|tool|cr||Saw, loupe and tweezers for gems. 25 gp.
Leatherworker's Tools|M|tool|cr||Knife, awl and thread. 5 gp.
Mason's Tools|M|tool|cr||Trowel, hammer and chisels. 10 gp.
Painter's Supplies|M|tool|cr,pc||Easel, canvas, paints and brushes. 10 gp.
Potter's Tools|M|tool|cr||Shaping tools and scrapers. 10 gp.
Smith's Tools|M|tool|cr||Hammers, tongs and a small anvil. 20 gp.
Tinker's Tools|M|tool|cr||For mending pots and small devices. 50 gp.
Weaver's Tools|M|tool|cr||Thread, needles and cloth. 1 gp.
Woodcarver's Tools|M|tool|cr||Knife, gouge and small saw. 1 gp.
Lute|M|tool|pc||A well-made string instrument. 35 gp.
Flute|M|tool|pc||A wooden flute. 2 gp.
Lyre|M|tool|pc||A small harp-like instrument. 30 gp.
Drum|M|tool|pc||A hand drum. 6 gp.
Dice Set|M|tool|pc||Bone dice. 1 sp.
Playing Card Set|M|tool|pc||A worn deck of cards. 5 sp.
Common Clothes|M|clothes|ap||Plain, sturdy everyday wear. 5 sp.
Costume|M|clothes|ap,st||Clothes for playing a part. 5 gp.
Fine Clothes|M|clothes|ap,pc||Clothes fit for a noble's party. 15 gp.
Traveler's Clothes|M|clothes|ap,qs||Boots, cloak and hard-wearing layers. 2 gp.
Robes|M|clothes|ap||Ceremonial or everyday robes. 1 gp.
Traveler's Boots|M|shoes|ap,sh,qs||Broken-in leather boots that keep your feet dry. 2 gp.
Hobnailed Work Boots|M|shoes|ap,sh||Heavy boots with iron studs in the soles. 1 gp.
Soft Leather Slippers|M|shoes|ap,sh,st||Quiet on stone floors. 5 sp.
Fine Buckled Shoes|M|shoes|ap,sh,pc||Polished shoes with silver buckles. 10 gp.
Fur-Lined Winter Boots|M|shoes|ap,sh,qs||Warm to the knee. 5 gp.
Riding Boots with Spurs|M|shoes|ap,sh,pt||Tall boots for long days in the saddle. 4 gp.
Wooden Clogs|M|shoes|ap,sh||Loud, sturdy and surprisingly comfortable. 2 sp.
Thick Wool Socks|M|shoes|ap,sh,pc|q:1d4|Pairs of warm socks. Underrated. 1 cp a pair.
Mastiff|M|pet|pt,bt||A loyal guard dog. 25 gp.
Pony|M|pet|pt||Small, stubborn and dependable. 30 gp.
Riding Horse|M|pet|pt,qs||A steady mount. 75 gp.
Mule|M|pet|pt||Carries your gear without complaint. Mostly. 8 gp.
Draft Horse|M|pet|pt||Big, strong and calm. 50 gp.
Cat|M|pet|pt,st||Ignores you until you have food.
Rat|M|pet|pt,st||Clever and good at fitting through gaps.
Frog|M|pet|pt||It just sits there. Perfect.
Weasel|M|pet|pt,st||Fast, nosy and keen-scented.
Hawk|C|pet|pt,dt||Sharp eyes in the sky.
Owl|C|pet|pt,dt,st||Sees in the dark and flies silently.
Raven|C|pet|pt,dt||Can mimic simple sounds and words.
Camel|C|pet|pt,qs||Made for the desert. 50 gp.
Wolf Pup|U|pet|pt||Will grow into a pack hunter.
Warhorse|U|pet|pt||Trained for battle. 400 gp.
Giant Badger|U|pet|pt,bw||Digs fast and bites hard.
Axe Beak|U|pet|pt||A tall, flightless bird with a bad temper.
Giant Goat|U|pet|pt,qs||Sure-footed in mountains.
Giant Owl|U|pet|pt,dt||Large enough to ride for a small rider. Speaks Giant Owl.
Panther Cub|U|pet|pt,st||A stealthy hunter in the making.
Hippogriff Egg|R|pet|pt||Hatches into a flying mount in a few weeks.
Griffon Egg|R|pet|pt||Raised from the egg, a griffon can be trained as a mount.
Pseudodragon|R|pet|pt||A tiny, telepathic dragon that likes shiny things.
Elephant|R|pet|pt,bw||Enormous and unforgettable. 200 gp.
Blink Dog Pup|V|pet|pt||A teleporting fey hound.
Pegasus Foal|V|pet|pt,qs||A winged horse that will fly when grown.
Dragon Egg|L|pet|pt||A warm, heavy egg. Something inside is moving.
Riding Saddle|M|gear|pt||A saddle for long rides. 10 gp.
Saddlebags|M|gear|pt,qs||Leather bags for a mount. 4 gp.
Animal Feed|M|gear|pt|q:10|Days of feed. 5 cp each.
Bit and Bridle|M|gear|pt||Steers a mount. 2 gp.
Leather Barding|C|gear|pt||Armor for a mount, AC 11. 40 gp.
A Single Left Boot|M|junk|jk,sh||Good condition. No right one in sight.
Rusty Key|M|junk|jk||It opens nothing. You will try it on everything.
Rock with Painted Eyes|M|junk|jk||It is watching you.
Love Letter|M|junk|jk||Passionate, badly spelled, and addressed to someone else.
Goblin IOU|M|junk|jk||Promises 3 gp. Signed with a thumbprint.
Map to This Exact Spot|M|junk|jk||X marks the box you just opened.
Bucket with a Hole|M|junk|jk||There's a hole in the bucket.
Half-Eaten Ration|M|junk|jk||Someone got here first.
Very Angry Chicken|M|junk|jk,pt||It escapes the box at the first chance and pecks whoever is closest.
Jar of Pickled Eyes|M|junk|jk||They're olives. Probably.
Mimic Tooth|M|junk|jk||Still sticky.
Wet Sock|M|junk|jk,sh||Just one. Cold. Inexplicably damp forever.
Iron (1 lb)|M|trade|cr|q:2d10|Iron bar. 1 sp per pound.
Copper (1 lb)|M|trade|cr|q:1d10|Copper bar. 5 sp per pound.
Silver (1 lb)|C|trade|cr|q:1d6|Silver bar. 5 gp per pound.
Gold (1 lb)|U|trade|cr|q:1d4|Gold bar. 50 gp per pound.
Platinum (1 lb)|R|trade|cr|q:1d4|Platinum bar. 500 gp per pound.
Linen (1 sq yd)|M|trade|cr|q:1d6|Fine linen cloth. 5 gp per yard.
Silk (1 sq yd)|C|trade|cr|q:1d6|Silk cloth. 10 gp per yard.
Saffron (1 lb)|C|trade|cr|q:1d4|Costly spice. 15 gp per pound.
Mithral Ingot|R|trade|cr||Light, strong metal. A smith can make it into mithral armor.
Adamantine Ingot|R|trade|cr||Very hard metal. A smith can make it into adamantine armor.
Dragon Scales|V|trade|cr||A bundle of scales. An armorer can make dragon scale mail from enough of them.
Azurite|M|gem||10 gp|Opaque, mottled deep blue.
Banded Agate|M|gem||10 gp|Translucent with brown, blue, white or red stripes.
Blue Quartz|M|gem||10 gp|Transparent pale blue.
Eye Agate|M|gem||10 gp|Translucent with grey, white, brown, blue or green circles.
Hematite|M|gem||10 gp|Opaque grey-black.
Lapis Lazuli|M|gem||10 gp|Opaque light and dark blue with yellow flecks.
Malachite|M|gem||10 gp|Opaque striated light and dark green.
Moss Agate|M|gem||10 gp|Translucent pink or yellow-white with mossy grey or green markings.
Obsidian|M|gem||10 gp|Opaque black.
Rhodochrosite|M|gem||10 gp|Opaque light pink.
Tiger Eye|M|gem||10 gp|Translucent brown with a golden centre.
Turquoise|M|gem||10 gp|Opaque light blue-green.
Bloodstone|C|gem||50 gp|Opaque dark grey with red flecks.
Carnelian|C|gem||50 gp|Opaque orange to red-brown.
Chalcedony|C|gem||50 gp|Opaque white.
Chrysoprase|C|gem||50 gp|Translucent green.
Citrine|C|gem||50 gp|Transparent pale yellow-brown.
Jasper|C|gem||50 gp|Opaque blue, black or brown.
Moonstone|C|gem||50 gp|Translucent white with a pale blue glow.
Onyx|C|gem||50 gp|Opaque bands of black and white.
Quartz|C|gem||50 gp|Transparent white, smoky grey or yellow.
Sardonyx|C|gem||50 gp|Opaque bands of red and white.
Star Rose Quartz|C|gem||50 gp|Translucent rosy stone with a white star at its centre.
Zircon|C|gem||50 gp|Transparent pale blue-green.
Amber|U|gem||100 gp|Transparent watery gold to rich gold.
Amethyst|U|gem||100 gp|Transparent deep purple.
Chrysoberyl|U|gem||100 gp|Transparent yellow-green to pale green.
Coral|U|gem||100 gp|Opaque crimson.
Garnet|U|gem||100 gp|Transparent red, brown-green or violet.
Jade|U|gem||100 gp|Translucent light green, deep green or white.
Jet|U|gem||100 gp|Opaque deep black.
Pearl|U|gem||100 gp|Opaque lustrous white, yellow or pink.
Spinel|U|gem||100 gp|Transparent red, red-brown or deep green.
Tourmaline|U|gem||100 gp|Transparent pale green, blue, brown or red.
Alexandrite|R|gem||500 gp|Transparent dark green.
Aquamarine|R|gem||500 gp|Transparent pale blue-green.
Black Pearl|R|gem||500 gp|Opaque pure black.
Blue Spinel|R|gem||500 gp|Transparent deep blue.
Peridot|R|gem||500 gp|Transparent rich olive green.
Topaz|R|gem||500 gp|Transparent golden yellow.
Black Opal|V|gem||1,000 gp|Translucent dark green with black mottling and golden flecks.
Blue Sapphire|V|gem||1,000 gp|Transparent blue-white to medium blue.
Emerald|V|gem||1,000 gp|Transparent deep bright green.
Fire Opal|V|gem||1,000 gp|Translucent fiery red.
Opal|V|gem||1,000 gp|Translucent pale blue with green and golden mottling.
Star Ruby|V|gem||1,000 gp|Translucent ruby with a white star at its centre.
Star Sapphire|V|gem||1,000 gp|Translucent blue sapphire with a white star at its centre.
Yellow Sapphire|V|gem||1,000 gp|Transparent fiery yellow or yellow-green.
Black Sapphire|L|gem||5,000 gp|Translucent lustrous black with glowing highlights.
Diamond|L|gem||5,000 gp|Transparent blue-white, canary, pink, brown or blue.
Jacinth|L|gem||5,000 gp|Transparent fiery orange.
Ruby|L|gem||5,000 gp|Transparent clear red to deep crimson.
Carved Soapstone Owl|C|art||25 gp|Palm-sized and smooth from handling.
Tin Music Box|C|art||25 gp|Plays one tune, slightly off-key.
Silver Hair Comb|C|art||25 gp|Engraved with ivy leaves.
Embroidered Silk Scarf|C|art||25 gp|Stitched with tiny stars.
Illuminated Prayer Book|U|art||250 gp|Gold leaf on every page.
Ivory Chess Set|U|art||250 gp|One knight is missing its head.
Garnet-Set Silver Chalice|U|art||250 gp|Heavy and cold to the touch.
Bronze Satyr Statuette|U|art||250 gp|A satyr mid-dance, playing pipes.
Jade Dragon Mask|R|art||750 gp|A sleeping dragon's face carved from one piece of jade.
Moonstone Circlet|R|art||750 gp|Fine gold wire set with moonstones.
Portrait of a Forgotten Queen|R|art||750 gp|Oil on wood. Her eyes seem to follow you.
Gold Reliquary|V|art||2,500 gp|Studded with sapphires; something small rattles inside.
White Elven Harp|V|art||2,500 gp|Ancient, perfectly tuned.
Jeweled Crown|L|art||7,500 gp|Gold, rubies and a great deal of history.
Platinum Dragon Statuette|L|art||7,500 gp|A coiled dragon with ruby eyes.
Assassin's Blood|C|poison|st|150 gp|Ingested. DC 10 Con save or take 1d12 poison and be poisoned for 24 hours.
Truth Serum|C|poison|st,pc,bt|150 gp|Ingested. DC 11 Con save or be unable to knowingly lie for 1 hour.
Basic Poison|C|poison|st,cbp|100 gp|Coat a weapon or 3 pieces of ammo. DC 10 Con save or 1d4 poison. One minute.
Serpent Venom|U|poison|st|200 gp|Injury. DC 11 Con save; 3d6 poison, half on a success.
Crawler Mucus|U|poison|st,bt|200 gp|Contact. DC 13 Con save or poisoned and paralyzed for 1 minute.
Drow Poison|U|poison|st,bt|200 gp|Injury. DC 13 Con save or poisoned for 1 hour; fail by 5+ and fall unconscious.
Malice|U|poison|st|250 gp|Inhaled. DC 15 Con save or poisoned and blinded for 1 hour.
Pale Tincture|U|poison|st|250 gp|Ingested. DC 16 Con save or 1d6 poison and poisoned; repeats daily.
Essence of Ether|U|poison|st,bt|300 gp|Inhaled. DC 15 Con save or poisoned and unconscious for 8 hours.
Oil of Taggit|R|poison|st,bt|400 gp|Contact. DC 13 Con save or poisoned and unconscious for 24 hours.
Burnt Othur Fumes|R|poison|st|500 gp|Inhaled. DC 13 Con save or 3d6 poison, repeating each turn.
Torpor|R|poison|st,bt|600 gp|Ingested. DC 15 Con save or poisoned and incapacitated for 4d6 hours.
Wyvern Poison|V|poison|st|1,200 gp|Injury. DC 15 Con save; 7d6 poison, half on a success.
Midnight Tears|V|poison|st|1,500 gp|Ingested. Nothing until midnight, then DC 17 Con save or 9d6 poison.
Purple Worm Poison|V|poison|st|2,000 gp|Injury. DC 19 Con save; 12d6 poison, half on a success.
Acid|M|bomb|ex,cbp|q:1d2|Thrown vial: 2d6 acid on a hit. 25 gp each.
Alchemist's Fire|M|bomb|ex,cbp|q:1d2|Thrown flask: 1d4 fire each turn until put out. 50 gp each.
Bomb|C|bomb|ex,cbp|q:1d3|Lit and thrown: 3d6 fire in a 5-ft radius, DC 12 Dex for half. 150 gp each.
Gunpowder Horn|C|bomb|ex||Set off, it blasts 3d6 fire in 10 ft, DC 12 Dex for half. 35 gp.
Dynamite|U|bomb|ex,cbp|q:1d4|Sticks. Each blasts 3d6 bludgeoning in 5 ft, DC 12 Dex for half. Bundle for more.
Gunpowder Keg|U|bomb|ex||Set off, it blasts 7d6 fire in 10 ft, DC 12 Dex for half. 250 gp.
Smoke Grenade|U|bomb|ex,st|q:1d3|Fills a 20-ft radius with heavy smoke for 1 minute.
Fragmentation Grenade|R|bomb|ex,cbp|q:1d2|5d6 piercing in a 20-ft radius, DC 15 Dex for half.
Potion of Healing|C|heal|hl,cbp,pc|q:1d3|Regain 2d4 + 2 hit points.
Potion of Greater Healing|U|heal|hl,cbp,pc|q:1d2|Regain 4d4 + 4 hit points.
Potion of Superior Healing|R|heal|hl,cbp,pc||Regain 8d4 + 8 hit points.
Potion of Supreme Healing|V|heal|hl,cbp,pc||Regain 10d4 + 20 hit points.
Potion of Climbing|C|potion|ut,st,qs||Climbing speed equal to walking speed and advantage on climbing checks for 1 hour.
Potion of Animal Friendship|U|potion|pt,pc||Cast animal friendship (DC 13) at will for 1 hour.
Potion of Fire Breath|U|potion|ex,cbp||Exhale fire up to three times in an hour: 4d6, DC 13 Dex for half.
Potion of Growth|U|potion|bw,cbp||Enlarged for 1d4 hours.
Potion of Hill Giant Strength|U|potion|bw,cbp||Strength becomes 21 for 1 hour.
Potion of Poison|U|potion|cu||Looks like healing. DC 13 Con save or 3d6 poison and poisoned.
Potion of Resistance|U|potion|cbp|v:dmg|Resistance to one damage type for 1 hour.
Potion of Water Breathing|U|potion|qs,ut||Breathe underwater for 1 hour.
Philter of Love|U|potion|pc||The next creature you see within 10 minutes charms you for 1 hour.
Potion of Clairvoyance|R|potion|dt,qs||Gain the effect of the clairvoyance spell.
Potion of Diminution|R|potion|st||Reduced for 1d4 hours.
Potion of Frost Giant Strength|R|potion|bw,cbp||Strength becomes 23 for 1 hour.
Potion of Stone Giant Strength|R|potion|bw,cbp||Strength becomes 23 for 1 hour.
Potion of Fire Giant Strength|R|potion|bw,cbp||Strength becomes 25 for 1 hour.
Potion of Gaseous Form|R|potion|st||Gain the effect of gaseous form for 1 hour.
Potion of Heroism|R|potion|cbp||10 temporary hit points and bless for 1 hour.
Potion of Invulnerability|R|potion|bw,cbp||Resistance to all damage for 1 minute.
Potion of Mind Reading|R|potion|dt,pc||Gain the effect of detect thoughts (DC 13).
Elixir of Health|R|potion|hl,pc||Cures disease and the blinded, deafened, paralyzed and poisoned conditions.
Oil of Etherealness|R|potion|st||Coated creature turns ethereal for 1 hour.
Oil of Slipperiness|U|potion|st,ut||Gain freedom of movement for 8 hours, or pour it out as a grease spell.
Potion of Cloud Giant Strength|V|potion|bw,cbp||Strength becomes 27 for 1 hour.
Potion of Flying|V|potion|qs,cbp||Flying speed equal to walking speed for 1 hour.
Potion of Invisibility|V|potion|st||Invisible for 1 hour, or until you attack or cast a spell.
Potion of Longevity|V|potion|pc||Physical age drops by 1d6 + 6 years. Repeated use has a growing risk of aging instead.
Potion of Speed|V|potion|cbp||Gain the effect of haste for 1 minute.
Potion of Vitality|V|potion|hl||Removes exhaustion, cures disease and poison, and maximises Hit Dice healing for 24 hours.
Oil of Sharpness|V|potion|cbp,cr||Coat a slashing or piercing weapon: +3 to attack and damage for 1 hour.
Potion of Storm Giant Strength|L|potion|bw,cbp||Strength becomes 29 for 1 hour.
Spell Scroll (Cantrip)|C|scroll||lv:0|A spell scroll holding a cantrip.
Spell Scroll (1st Level)|C|scroll||lv:1|A spell scroll holding a 1st-level spell.
Spell Scroll (2nd Level)|U|scroll||lv:2|A spell scroll holding a 2nd-level spell.
Spell Scroll (3rd Level)|U|scroll||lv:3|A spell scroll holding a 3rd-level spell.
Spell Scroll (4th Level)|R|scroll||lv:4|A spell scroll holding a 4th-level spell.
Spell Scroll (5th Level)|R|scroll||lv:5|A spell scroll holding a 5th-level spell.
Spell Scroll (6th Level)|V|scroll||lv:6|A spell scroll holding a 6th-level spell.
Spell Scroll (7th Level)|V|scroll||lv:7|A spell scroll holding a 7th-level spell.
Spell Scroll (8th Level)|V|scroll||lv:8|A spell scroll holding an 8th-level spell.
Spell Scroll (9th Level)|L|scroll||lv:9|A spell scroll holding a 9th-level spell.
Scroll of Protection|R|scroll|pc|v:prot|For 5 minutes, creatures of one type can't enter a 5-ft barrier around you.
Weapon, +1|U|mwpn|m,r,fin,cb|b:w|+1 to attack and damage rolls.
Weapon, +2|R|mwpn|m,r,fin,cb|b:w|+2 to attack and damage rolls.
Weapon, +3|V|mwpn|m,r,fin,cb|b:w|+3 to attack and damage rolls.
Weapon of Warning|U|mwpn|m,r,cb,dt|b:w|You and allies within 30 ft can't be surprised and get advantage on initiative.
Vicious Weapon|R|mwpn|m,r,cb|b:w|A natural 20 deals an extra 2d6 damage.
Javelin of Lightning|U|mwpn|m,r,ex,cb||Throw it to become a 120-ft lightning bolt: 4d6 lightning, DC 13 Dex for half. Once per day.
Trident of Fish Command|U|mwpn|m,pt||Cast dominate beast on aquatic beasts. 3 charges.
Sword of Vengeance|U|mwpn|m,cu|b:s|+1 weapon, cursed by a vengeful spirit that forces you to fight.
Berserker Axe|R|mwpn|m,bw,cu|b:ax|+1 axe and +1 HP per level, but cursed with berserk rage.
Dagger of Venom|R|mwpn|m,fin,st,cb||+1 dagger. Once a day, coat the blade: DC 15 Con or 2d10 poison and poisoned.
Dragon Slayer|R|mwpn|m,cb|b:s|+1 sword; an extra 3d6 damage against dragons.
Flame Tongue|R|mwpn|m,fin,ex,cb|b:s|Command word sets it alight: +2d6 fire and bright light.
Giant Slayer|R|mwpn|m,cb|b:sa|+1 weapon; extra 2d6 against giants and can knock them prone.
Mace of Disruption|R|mwpn|m,cb||+2d6 radiant against fiends and undead; may destroy weak ones outright.
Mace of Smiting|R|mwpn|m,bw,cb||+1 mace, +3 against constructs; natural 20s hit extra hard.
Mace of Terror|R|mwpn|m,cb||3 charges: frighten creatures within 30 ft (DC 15 Wis).
Sun Blade|R|mwpn|m,fin,cb||A hilt that grows a blade of radiance. +2 longsword, extra damage against undead.
Sword of Life Stealing|R|mwpn|m,cb|b:s|Natural 20s deal 3d6 necrotic and heal you.
Sword of Wounding|R|mwpn|m,cb|b:s|Wounds that won't close: extra necrotic damage each turn.
Dancing Sword|V|mwpn|m,cb|b:s|Toss it into the air and it fights on its own for a few turns.
Dwarven Thrower|V|mwpn|m,r,bw,cb||+3 warhammer that returns when thrown; extra damage in a dwarf's hands.
Frost Brand|V|mwpn|m,cb|b:s|+1d6 cold, resistance to fire, and it puts out flames.
Nine Lives Stealer|V|mwpn|m,cb|b:s|+2 sword with a few charges that can slay a creature outright on a critical.
Oathbow|V|mwpn|r,cb||Longbow that swears enmity against one foe for extra damage.
Scimitar of Speed|V|mwpn|m,fin,cb||+2 scimitar; make an extra attack as a bonus action.
Sword of Sharpness|V|mwpn|m,cb|b:s|Maximum damage against objects; natural 20s can lop off limbs.
Defender|L|mwpn|m,cb|b:s|+3 sword; move some of the bonus to your AC each turn.
Hammer of Thunderbolts|L|mwpn|m,bw,cb||+1 maul that can slay giants and be thrown for a thunderclap.
Holy Avenger|L|mwpn|m,cb|b:s|+3 sword with extra radiant damage; a paladin's aura grants advantage against spells.
Luck Blade|L|mwpn|m,cb|b:s|+1 sword that grants luck and may hold a wish or two.
Vorpal Sword|L|mwpn|m,cb|b:s|+3 sword that cuts through resistances; natural 20s sever heads.
Sword of Answering|L|mwpn|m,cb||+3 longsword that strikes back at anyone who hits you.
Ammunition, +1|U|mammo|r,cb|b:ammo,q:2d6|+1 to attack and damage. Each piece is spent once it hits.
Ammunition, +2|R|mammo|r,cb|b:ammo,q:2d4|+2 to attack and damage. Each piece is spent once it hits.
Ammunition, +3|V|mammo|r,cb|b:ammo,q:1d6|+3 to attack and damage. Each piece is spent once it hits.
Arrow of Slaying|V|mammo|r,cb|v:ct|Deals an extra 6d10 piercing to one creature type, DC 17 Con for half.
Adamantine Armor|U|marmor|ap,cb|b:am|Critical hits against you become normal hits.
Mithral Armor|U|marmor|ap,st|b:am|Lighter: no Strength requirement and no Stealth penalty.
Mariner's Armor|U|marmor|ap,qs|b:a|Swim speed equal to walking speed; you float up if you drop to 0 HP underwater.
Armor, +1|R|marmor|ap,cb|b:a|+1 AC.
Armor of Resistance|R|marmor|ap,cb|b:a,v:dmg|Resistance to one damage type.
Armor of Vulnerability|R|marmor|ap,cu||Plate that grants resistance to one physical type and vulnerability to the other two.
Elven Chain|R|marmor|ap,st||Chain shirt, +1 AC, wearable without proficiency.
Glamoured Studded Leather|R|marmor|ap,st||+1 studded leather that can look like any clothes you like.
Armor, +2|V|marmor|ap,cb|b:a|+2 AC.
Demon Armor|V|marmor|ap,cu,bw||+1 plate with clawed gauntlets that can't be removed.
Dragon Scale Mail|V|marmor|ap,cb|v:drag|+1 scale mail with resistance to one dragon's damage type.
Dwarven Plate|V|marmor|ap,cb||+2 plate; reduce forced movement by 10 ft.
Armor, +3|L|marmor|ap,cb|b:a|+3 AC.
Armor of Invulnerability|L|marmor|ap,cb||Plate with resistance to nonmagical damage; can turn immune for 10 minutes once a day.
Plate Armor of Etherealness|L|marmor|ap,st||Plate that lets you cast etherealness once per day.
Shield, +1|U|mshield|cb||+1 AC on top of the normal shield bonus.
Sentinel Shield|U|mshield|cb,dt||Advantage on initiative and Perception.
Shield, +2|R|mshield|cb||+2 AC on top of the normal shield bonus.
Arrow-Catching Shield|R|mshield|cb||+2 AC against ranged attacks; redirect attacks aimed at nearby allies.
Shield of Missile Attraction|R|mshield|cu||Resistance to ranged attacks, but cursed to draw every arrow to you.
Shield, +3|V|mshield|cb||+3 AC on top of the normal shield bonus.
Animated Shield|V|mshield|cb||Command it to float and protect you hands-free.
Spellguard Shield|V|mshield|cb||Advantage on saves against spells; spell attacks have disadvantage against you.
Ring of Jumping|U|ring|ut,bw||Cast jump on yourself at will.
Ring of Mind Shielding|U|ring|pc,st||Immune to mind reading and lying-detection magic.
Ring of Swimming|U|ring|qs||40-ft swimming speed.
Ring of Warmth|U|ring|qs,pc||Resistance to cold; comfortable down to -50 °F.
Ring of Water Walking|U|ring|qs,ut||Walk on liquid as if it were solid ground.
Ring of Animal Influence|R|ring|pt,pc||3 charges: animal friendship, fear on beasts, or speak with animals.
Ring of Evasion|R|ring|st,cb||3 charges: turn a failed Dex save into a success.
Ring of Feather Falling|R|ring|ut,qs||You fall slowly and take no falling damage.
Ring of Free Action|R|ring|bw,qs||Difficult terrain, paralysis and restraint can't slow you.
Ring of Protection|R|ring|pc,cb||+1 AC and saving throws.
Ring of Resistance|R|ring|cb|v:dmg|Resistance to one damage type.
Ring of Spell Storing|R|ring|ut,cb||Holds up to 5 levels of spells for later casting.
Ring of the Ram|R|ring|bw,cb||3 charges: a ghostly ram slams a creature or object.
Ring of X-ray Vision|R|ring|dt,st||See through solid matter within 30 ft.
Ring of Regeneration|V|ring|hl||Regain 1d6 HP every 10 minutes; lost limbs regrow.
Ring of Shooting Stars|V|ring|ex,cb||Lights, faerie fire, ball lightning and shooting stars.
Ring of Telekinesis|V|ring|ut||Cast telekinesis at will on objects.
Ring of Air Elemental Command|L|ring|cb||Command air elementals and gain air-themed spells.
Ring of Djinni Summoning|L|ring|cb||Summon a djinni bound to the ring.
Ring of Earth Elemental Command|L|ring|cb||Command earth elementals and move through earth.
Ring of Fire Elemental Command|L|ring|ex,cb||Command fire elementals; immune to fire.
Ring of Invisibility|L|ring|st||Turn invisible at will.
Ring of Spell Turning|L|ring|cb||Advantage on saves against single-target spells; may reflect them.
Ring of Three Wishes|L|ring|ut||Three uses of the wish spell.
Ring of Water Elemental Command|L|ring|qs,cb||Command water elementals and walk on water.
Immovable Rod|U|rod|ut,cr||Press the button and it stays fixed in place, holding up to 8,000 lb.
Rod of the Pact Keeper, +1|U|rod|cb||Warlock focus: +1 spell attack and save DC; regain a slot once a day.
Rod of Rulership|R|rod|pc||Charm creatures within 120 ft for 8 hours (DC 15 Wis). Once a day.
Rod of the Pact Keeper, +2|R|rod|cb||Warlock focus: +2 spell attack and save DC; regain a slot once a day.
Rod of Absorption|V|rod|cb||Absorb spells targeting you and use their energy for your own.
Rod of Alertness|V|rod|dt||Advantage on initiative; cast detection spells and plant a watchful ward.
Rod of Security|V|rod|pc||Pull up to 200 creatures into a safe paradise to rest for days.
Rod of the Pact Keeper, +3|V|rod|cb||Warlock focus: +3 spell attack and save DC; regain a slot once a day.
Rod of Lordly Might|L|rod|bw,cb||+3 mace that turns into a flame blade, battleaxe, spear, ladder and more.
Rod of Resurrection|L|rod|hl||Cast heal or resurrection from its charges.
Staff of the Python|U|staff|pt||Throw it down and it becomes a giant constrictor snake.
Staff of Charming|R|staff|pc||Cast charm person, command or comprehend languages.
Staff of Healing|R|staff|hl,pc||Cast cure wounds, lesser restoration or mass cure wounds.
Staff of Swarming Insects|R|staff|cb||Summon insect swarms and cloud visibility.
Staff of the Woodlands|R|staff|pt,pc||+2 druid staff with nature spells; can become a tree.
Staff of Withering|R|staff|cb||Extra necrotic damage that can sap Strength and Constitution.
Staff of Fire|V|staff|ex,cb||Cast burning hands, fireball and wall of fire.
Staff of Frost|V|staff|cb||Cast cone of cold, fog cloud, ice storm and wall of ice.
Staff of Power|V|staff|cb||+2 staff with protective bonuses and powerful attack spells.
Staff of Striking|V|staff|bw,cb||+3 quarterstaff that spends charges for extra force damage.
Staff of Thunder and Lightning|V|staff|ex,cb||Lightning strikes, thunderclaps and storms.
Staff of the Magi|L|staff|cb||The archmage's staff: spell absorption, many spells and a devastating retributive strike.
Wand of Magic Detection|U|wand|dt||Cast detect magic.
Wand of Magic Missiles|U|wand|cb||Cast magic missile using charges.
Wand of Secrets|U|wand|dt,st||Points to the nearest secret door or trap within 30 ft.
Wand of the War Mage, +1|U|wand|cb||+1 to spell attack rolls and ignores half cover.
Wand of Web|U|wand|bt||Cast web (DC 15).
Wand of Binding|R|wand|bt||Cast hold monster or hold person.
Wand of Enemy Detection|R|wand|dt||Points to the nearest hostile creature within 60 ft.
Wand of Fear|R|wand|cb||Cast command (flee) or a cone of fear.
Wand of Fireballs|R|wand|ex,cb||Cast fireball (DC 15) with charges.
Wand of Lightning Bolts|R|wand|ex,cb||Cast lightning bolt (DC 15) with charges.
Wand of Paralysis|R|wand|bt||Ray that paralyzes for 1 minute (DC 15 Con).
Wand of the War Mage, +2|R|wand|cb||+2 to spell attack rolls and ignores half cover.
Wand of Wonder|R|wand|cu||Random magical effects. Could be a fireball. Could be butterflies.
Wand of Polymorph|V|wand|cb,cu||Cast polymorph (DC 15).
Wand of the War Mage, +3|V|wand|cb||+3 to spell attack rolls and ignores half cover.
Alchemy Jug|U|wond|cr,ut||Pours acid, beer, honey, mayonnaise, oil, vinegar, water or wine on command.
Amulet of Proof against Detection and Location|U|wond|st,pc||Hidden from divination magic.
Bag of Holding|U|wond|ut,qs||Holds 500 lb in an extradimensional space.
Gray Bag of Tricks|U|wond|pt||Pull out a fuzzy ball that becomes a random small beast ally.
Rust Bag of Tricks|U|wond|pt||Pull out a fuzzy ball that becomes a random beast ally.
Tan Bag of Tricks|U|wond|pt||Pull out a fuzzy ball that becomes a random larger beast ally.
Boots of Elvenkind|U|wond|ap,sh,st||Silent steps and advantage on Stealth checks to move quietly.
Boots of Striding and Springing|U|wond|ap,sh,qs||Walking speed 30 and triple jump distance.
Boots of the Winterlands|U|wond|ap,sh,qs||Resistance to cold, ignore icy terrain, and endure extreme cold.
Bracers of Archery|U|wond|ap,r,cb||+2 damage with longbows and shortbows.
Brooch of Shielding|U|wond|pc,cb||Resistance to force damage; immune to magic missile.
Broom of Flying|U|wond|qs||A broom that flies at 50 ft.
Cap of Water Breathing|U|wond|ap,qs||Breathe underwater inside a bubble.
Circlet of Blasting|U|wond|ap,ex,cb||Cast scorching ray once per day.
Cloak of Elvenkind|U|wond|ap,st||Advantage on Stealth; others have disadvantage to spot you.
Cloak of Protection|U|wond|ap,pc,cb||+1 AC and saving throws.
Cloak of the Manta Ray|U|wond|ap,qs||Breathe and swim underwater with the hood up.
Decanter of Endless Water|U|wond|ut,cr,qs||Pours water: a stream, a fountain or a geyser.
Deck of Illusions|U|wond|ut,pc,st||Throw a card to create an illusion of a creature.
Driftglobe|U|wond|ut,qs||A floating globe of light that can follow you.
Dust of Disappearance|U|wond|st||Everyone nearby turns invisible for 2d4 minutes.
Dust of Dryness|U|wond|ut||Turns water into a pellet; can wreck water elementals.
Dust of Sneezing and Choking|U|wond|cu,ex||Looks like dust of disappearance. Everyone nearby starts choking.
Elemental Gem|U|wond|cb|v:elem|Break it to summon an elemental.
Eversmoking Bottle|U|wond|st,pc||Pours out a huge cloud of thick smoke.
Eyes of Charming|U|wond|ap,pc||Cast charm person (DC 13) three times a day.
Eyes of Minute Seeing|U|wond|ap,cr,dt||Advantage on Investigation within 1 ft.
Eyes of the Eagle|U|wond|ap,dt,bt||Advantage on sight-based Perception; see far.
Gauntlets of Ogre Power|U|wond|ap,bw,cb||Strength becomes 19.
Gem of Brightness|U|wond|cb||Light, blinding rays and flashes.
Gloves of Missile Snaring|U|wond|ap,bw,cb||Catch ranged weapon attacks and reduce the damage.
Gloves of Swimming and Climbing|U|wond|ap,qs,st||Climb and swim at full speed; +5 to those checks.
Goggles of Night|U|wond|ap,st||Darkvision 60 ft.
Hat of Disguise|U|wond|ap,st||Cast disguise self at will.
Headband of Intellect|U|wond|ap||Intelligence becomes 19.
Helm of Comprehending Languages|U|wond|ap,qs,pc||Cast comprehend languages at will.
Helm of Telepathy|U|wond|ap,dt,pc||Cast detect thoughts; talk telepathically.
Heward's Handy Haversack|U|wond|ut,qs||A backpack with large magic pockets; what you need is always on top.
Instrument of the Bards: Doss Lute|U|wond|pc||A bard's lute that adds spells to their repertoire.
Instrument of the Bards: Fochlucan Bandore|U|wond|pc||A bard's bandore that adds spells to their repertoire.
Instrument of the Bards: Mac-Fuirmidh Cittern|U|wond|pc||A bard's cittern that adds spells to their repertoire.
Keoghtom's Ointment|U|wond|hl,pc||Heals 2d8 + 2 and cures poison and disease. 1d4 + 1 doses.
Lantern of Revealing|U|wond|dt,qs||Its light reveals invisible creatures.
Medallion of Thoughts|U|wond|dt||Cast detect thoughts (DC 13).
Necklace of Adaptation|U|wond|qs||Breathe in any environment.
Pearl of Power|U|wond|ut||Regain one expended spell slot of up to 3rd level each day.
Periapt of Health|U|wond|hl,pc||Immune to disease.
Periapt of Wound Closure|U|wond|hl,bw||Stabilize automatically and heal more from Hit Dice.
Pipes of Haunting|U|wond|pc||Play a creepy tune that frightens listeners (DC 15).
Pipes of the Sewers|U|wond|pt||Summon and befriend swarms of rats.
Robe of Useful Items|U|wond|ap,ut||Covered in patches that turn into real items.
Rope of Climbing|U|wond|ut,qs||60-ft rope that moves and knots itself on command.
Slippers of Spider Climbing|U|wond|ap,sh,st||Climb walls and ceilings hands-free.
Stone of Good Luck|U|wond|ut,pc||+1 to ability checks and saves.
Wind Fan|U|wond|ut||Cast gust of wind.
Winged Boots|U|wond|ap,sh,qs||Flying speed equal to walking speed, up to 4 hours a day.
Amulet of Health|R|wond|bw,hl||Constitution becomes 19.
Bag of Beans|R|wond|cu,ut||Plant a bean and see what happens. It is often a disaster.
Bead of Force|R|wond|ex,cb||Explodes for 5d4 force and traps creatures in a sphere.
Belt of Dwarvenkind|R|wond|ap,bw||+2 Con, darkvision, advantage on social checks with dwarves.
Belt of Hill Giant Strength|R|wond|ap,bw,cb||Strength becomes 21.
Boots of Levitation|R|wond|ap,sh,qs||Cast levitate on yourself at will.
Boots of Speed|R|wond|ap,sh,cb||Click heels to double your speed for 10 minutes.
Bowl of Commanding Water Elementals|R|wond|cb||Summon a water elemental.
Bracers of Defense|R|wond|ap,bw,cb||+2 AC without armor or a shield.
Brazier of Commanding Fire Elementals|R|wond|ex,cb||Summon a fire elemental.
Cape of the Mountebank|R|wond|ap,st||Cast dimension door once a day in a puff of smoke.
Censer of Controlling Air Elementals|R|wond|cb||Summon an air elemental.
Chime of Opening|R|wond|st,ut||Strike it to open a lock or lid within 120 ft.
Cloak of Displacement|R|wond|ap,cb||Attacks against you have disadvantage until you're hit.
Cloak of the Bat|R|wond|ap,st||Advantage on Stealth; fly in dim light; turn into a bat.
Cube of Force|R|wond|pc||Create a cube-shaped barrier around you.
Daern's Instant Fortress|R|wond|qs||A small cube that grows into a stone tower.
Dimensional Shackles|R|wond|bt||Manacles that prevent teleportation and planar travel.
Feather Token|R|wond|qs,ut|v:feather|Quaal's single-use feather that becomes something useful.
Figurine of Wondrous Power: Silver Raven|U|wond|pt,dt||Turns into a raven messenger.
Figurine of Wondrous Power: Bronze Griffon|R|wond|pt,qs||Turns into a griffon mount.
Figurine of Wondrous Power: Ebony Fly|R|wond|pt,qs||Turns into a giant fly you can ride.
Figurine of Wondrous Power: Golden Lions|R|wond|pt,cb||A pair of figurines that turn into lions.
Figurine of Wondrous Power: Ivory Goats|R|wond|pt,qs||Three goats of travelling, travail and terror.
Figurine of Wondrous Power: Marble Elephant|R|wond|pt,bw||Turns into an elephant.
Figurine of Wondrous Power: Onyx Dog|R|wond|pt,dt||Turns into a mastiff that can see invisible things.
Figurine of Wondrous Power: Serpentine Owl|R|wond|pt,dt||Turns into a giant owl that talks with you telepathically.
Folding Boat|R|wond|qs||A box that unfolds into a rowboat or a ship.
Gem of Seeing|R|wond|dt||Gain truesight for 10 minutes.
Helm of Teleportation|R|wond|ap,qs||Cast teleport three times.
Horn of Blasting|R|wond|ex,cb||Blast a cone of thunder for 5d6; it might explode on you.
Horn of Valhalla (Silver)|R|wond|cb||Summon spirit warriors to fight for you.
Horseshoes of Speed|R|wond|pt,sh||Your mount's walking speed rises by 30 ft.
Ioun Stone of Awareness|R|wond|dt||You can't be surprised.
Ioun Stone of Protection|R|wond|pc,cb||+1 AC.
Ioun Stone of Reserve|R|wond|ut||Stores spells for later.
Ioun Stone of Sustenance|R|wond|qs||No need to eat or drink.
Iron Bands of Bilarro|R|wond|bt||Throw the sphere and it binds a creature in iron bands.
Mantle of Spell Resistance|R|wond|ap,cb||Advantage on saves against spells.
Necklace of Fireballs|R|wond|ex,cb||Pull off a bead and throw it as a fireball.
Necklace of Prayer Beads|R|wond|hl,pc||Beads that cast healing and holy spells.
Periapt of Proof against Poison|R|wond|hl||Immune to poison.
Portable Hole|R|wond|ut,qs,st||A cloth circle that opens into a 10-ft-deep hole.
Robe of Eyes|R|wond|ap,dt||See all around you, including invisible things.
Rope of Entanglement|R|wond|bt||Animated rope that restrains a creature.
Wings of Flying|R|wond|ap,qs||Turn your cloak into bat or bird wings for an hour.
Instrument of the Bards: Canaith Mandolin|R|wond|pc||A bard's mandolin that adds spells to their repertoire.
Instrument of the Bards: Cli Lyre|R|wond|pc||A bard's lyre that adds spells to their repertoire.
Bag of Devouring|V|wond|cu||Looks like a bag of holding. It eats things. And hands.
Belt of Fire Giant Strength|V|wond|ap,bw,cb||Strength becomes 25.
Belt of Frost Giant Strength|V|wond|ap,bw,cb||Strength becomes 23.
Belt of Stone Giant Strength|V|wond|ap,bw,cb||Strength becomes 23.
Candle of Invocation|V|wond|ut||Blessed light for those aligned with it; can cast gate once.
Carpet of Flying|V|wond|qs||A flying carpet.
Cloak of Arachnida|V|wond|ap,st||Spider climb, web walking and poison resistance.
Crystal Ball|V|wond|dt,qs||Cast scrying.
Efreeti Bottle|V|wond|cb,cu||Release an efreeti. It might serve you, grant wishes, or attack.
Figurine of Wondrous Power: Obsidian Steed|V|wond|pt,qs||Turns into a nightmare mount.
Helm of Brilliance|V|wond|ap,ex,cb||Gems that cast fireball, daylight and more.
Horn of Valhalla (Brass)|V|wond|cb||Summon spirit warriors to fight for you.
Horn of Valhalla (Bronze)|V|wond|cb||Summon spirit warriors to fight for you.
Horseshoes of a Zephyr|V|wond|pt,sh||Your mount glides over the ground and never tires.
Ioun Stone of Absorption|V|wond|cb||Absorbs spells of 4th level or lower.
Ioun Stone of Agility|V|wond|cb||+2 Dexterity.
Ioun Stone of Fortitude|V|wond|bw||+2 Constitution.
Ioun Stone of Insight|V|wond|dt,pc||+2 Wisdom.
Ioun Stone of Intellect|V|wond|ut||+2 Intelligence.
Ioun Stone of Leadership|V|wond|pc||+2 Charisma.
Ioun Stone of Strength|V|wond|bw||+2 Strength.
Manual of Bodily Health|V|wond|bw||Study it for +2 Constitution, permanently.
Manual of Gainful Exercise|V|wond|bw||Study it for +2 Strength, permanently.
Manual of Golems|V|wond|cr||Instructions for building a golem.
Manual of Quickness of Action|V|wond|cb||Study it for +2 Dexterity, permanently.
Mirror of Life Trapping|V|wond|bt||Traps creatures that see their reflection.
Nolzur's Marvelous Pigments|V|wond|cr,pc||Paint things that become real.
Robe of Scintillating Colors|V|wond|ap,pc||Dazzling colors that stun onlookers.
Robe of Stars|V|wond|ap,qs||Throw stars as magic missiles and travel to the Astral Plane.
Tome of Clear Thought|V|wond|ut||Study it for +2 Intelligence, permanently.
Tome of Leadership and Influence|V|wond|pc||Study it for +2 Charisma, permanently.
Tome of Understanding|V|wond|pc||Study it for +2 Wisdom, permanently.
Instrument of the Bards: Anstruth Harp|V|wond|pc||A bard's harp that adds spells to their repertoire.
Apparatus of Kwalish|L|wond|qs,cu||A giant iron lobster submarine. Good luck working out the levers.
Belt of Cloud Giant Strength|L|wond|ap,bw,cb||Strength becomes 27.
Belt of Storm Giant Strength|L|wond|ap,bw,cb||Strength becomes 29.
Crystal Ball of Mind Reading|L|wond|dt||Scrying plus detect thoughts on the target.
Crystal Ball of Telepathy|L|wond|dt,pc||Scrying plus telepathic contact.
Crystal Ball of True Seeing|L|wond|dt||Scrying with truesight.
Cubic Gate|L|wond|qs||Six-sided cube opening portals to six planes.
Deck of Many Things|L|wond|cu||Draw a card. Change your life. Possibly end it.
Horn of Valhalla (Iron)|L|wond|cb||Summon spirit warriors to fight for you.
Instrument of the Bards: Ollamh Harp|L|wond|pc||The greatest bard's harp; adds powerful spells.
Ioun Stone of Greater Absorption|L|wond|cb||Absorbs spells of 8th level or lower.
Ioun Stone of Mastery|L|wond|ut||+1 proficiency bonus.
Ioun Stone of Regeneration|L|wond|hl||Regain 15 HP every hour.
Robe of the Archmagi|L|wond|ap,cb||+AC, advantage on spell saves, and stronger spells for the right wizard.
Scarab of Protection|L|wond|pc,cb||Advantage on spell saves; can save you from necromancy.
Sovereign Glue|L|wond|cr,cu||Bonds two things together permanently.
Sphere of Annihilation|L|wond|cu,cb||A 2-ft sphere of nothing that destroys whatever it touches.
Talisman of Pure Good|L|wond|cb||A good cleric's focus that can send an evil foe into a fiery pit.
Talisman of the Sphere|L|wond|ut||Lets you control a sphere of annihilation more easily.
Talisman of Ultimate Evil|L|wond|cb||An evil cleric's focus that can destroy a good foe.
Universal Solvent|L|wond|cr||Dissolves any adhesive, including sovereign glue.
Well of Many Worlds|L|wond|qs||A cloth circle that opens a portal to another world.
Axe of the Dwarvish Lords|A|artifact|bw,cb||+3 axe of the first dwarf king; grants dwarven boons and a terrible curse.
Book of Exalted Deeds|A|artifact|pc,hl||Holy text that elevates the good and burns the wicked.
Book of Vile Darkness|A|artifact|cu||A tome of evil secrets that corrupts its reader.
Eye of Vecna|A|artifact|dt,cu||Gouge out your eye and replace it. Grants truesight and spells. Terrible price.
Hand of Vecna|A|artifact|cb,cu||Cut off your hand and attach this. Great power, great cost.
Orb of Dragonkind|A|artifact|cb||Dragon-controlling orb from an ancient war.
Sword of Kas|A|artifact|cb|b:longsword|+3 sword forged for Vecna's betrayer; it craves blood.
Wand of Orcus|A|artifact|cb,cu||The demon prince's skull-topped rod of death.
`;

const SRC_BY_CAT={wpn:'PHB',ammo:'PHB',armor:'PHB',shield:'PHB',gear:'PHB',tool:'PHB',clothes:'PHB',trade:'PHB',shoes:'Basic',pet:'Basic',junk:'Basic',art:'Basic'};
const BASIC_NAMES=new Set(['Mithral Ingot','Adamantine Ingot','Dragon Scales','Riding Saddle','Saddlebags','Animal Feed','Bit and Bridle','Leather Barding']);
const PHB_OVERRIDE=new Set(['Basic Poison','Acid',"Alchemist's Fire",'Mastiff','Pony','Riding Horse','Mule','Draft Horse','Camel','Warhorse','Elephant']);

const RAR=['M','C','U','R','V','L','A'];
const RNAME={M:'Mundane',C:'Common',U:'Uncommon',R:'Rare',V:'Very rare',L:'Legendary',A:'Artifact'};
const CATS={wpn:'Weapon',ammo:'Ammunition',armor:'Armor',shield:'Shield',gear:'Adventuring gear',tool:'Tool',clothes:'Clothing',shoes:'Footwear',pet:'Animal',poison:'Poison',bomb:'Explosive',trade:'Trade good',gem:'Gemstone',art:'Art object',junk:'Junk',mwpn:'Magic weapon',mammo:'Magic ammunition',marmor:'Magic armor',mshield:'Magic shield',heal:'Healing potion',potion:'Potion',scroll:'Scroll',ring:'Ring',rod:'Rod',staff:'Staff',wand:'Wand',wond:'Wondrous item',artifact:'Artifact'};
const MAGIC_CATS=['mwpn','mammo','marmor','mshield','heal','potion','scroll','ring','rod','staff','wand','wond','artifact'];
const ROLES={m:'Melee weapon',r:'Ranged weapon',fin:'Light / finesse',st:'Stealth',cb:'Combat',cbp:'Combat consumable',hl:'Healing',ap:'Apparel',sh:'Footwear',pc:'Peaceful',bw:'Brawling',cr:'Crafting',ex:'Explosive',pt:'Pet',qs:'Travel / quest',bt:'Capture',dt:'Detection',ut:'Utility',cu:'Cursed / prank'};

const VARIANTS={
  dmg:['Acid','Cold','Fire','Force','Lightning','Necrotic','Poison','Psychic','Radiant','Thunder'],
  drag:['Black','Blue','Brass','Bronze','Copper','Gold','Green','Red','Silver','White'],
  ct:['Aberrations','Beasts','Celestials','Constructs','Dragons','Elementals','Fey','Fiends','Giants','Humanoids','Monstrosities','Oozes','Plants','Undead'],
  prot:['Aberrations','Beasts','Celestials','Elementals','Fey','Fiends','Plants','Undead'],
  elem:['Blue Sapphire: Air','Yellow Diamond: Earth','Red Corundum: Fire','Emerald: Water'],
  feather:['Anchor','Bird','Fan','Swan Boat','Tree','Whip']
};
const BASES={
  s:['Longsword','Shortsword','Greatsword','Scimitar','Rapier'],
  ax:['Battleaxe','Greataxe','Handaxe'],
  sa:['Longsword','Shortsword','Greatsword','Scimitar','Rapier','Battleaxe','Greataxe','Handaxe'],
  a:['Padded Armor','Leather Armor','Studded Leather Armor','Hide Armor','Chain Shirt','Scale Mail','Breastplate','Half Plate','Ring Mail','Chain Mail','Splint Armor','Plate Armor'],
  am:['Chain Shirt','Scale Mail','Breastplate','Half Plate','Chain Mail','Splint Armor','Plate Armor'],
  ammo:['Arrows','Crossbow Bolts','Sling Bullets'],
  longsword:['Longsword']
};
const FIXED_BASE={'Dagger of Venom':'Dagger','Dwarven Thrower':'Warhammer','Mace of Disruption':'Mace','Mace of Smiting':'Mace','Mace of Terror':'Mace','Scimitar of Speed':'Scimitar','Oathbow':'Longbow','Javelin of Lightning':'Javelin','Trident of Fish Command':'Trident','Hammer of Thunderbolts':'Maul','Sun Blade':'Longsword','Sword of Answering':'Longsword'};

const SPELLS={
0:'Fire Bolt:cf;Light:u;Mage Hand:u;Minor Illusion:s;Prestidigitation:u;Guidance:up;Message:su;Mending:u;Ray of Frost:c;Spare the Dying:hp;Thaumaturgy:u;Friends:p;Produce Flame:f',
1:'Cure Wounds:hp;Healing Word:h;Magic Missile:c;Shield:c;Sleep:p;Disguise Self:s;Silent Image:s;Feather Fall:u;Detect Magic:u;Comprehend Languages:u;Burning Hands:fc;Thunderwave:c;Charm Person:p;Fog Cloud:s;Sanctuary:p;Longstrider:u',
2:'Invisibility:s;Pass without Trace:s;Misty Step:sc;Scorching Ray:fc;Hold Person:cp;Lesser Restoration:h;Spiritual Weapon:c;Knock:u;Suggestion:p;Calm Emotions:p;Darkvision:u;Spider Climb:s;Locate Object:u;Silence:s;Aid:h;Flaming Sphere:f',
3:'Fireball:fc;Lightning Bolt:c;Counterspell:c;Fly:u;Haste:c;Revivify:h;Dispel Magic:u;Sending:u;Water Breathing:u;Tongues:up;Nondetection:s;Hypnotic Pattern:p;Mass Healing Word:h;Fear:c;Remove Curse:hu;Leomund\'s Tiny Hut:up',
4:'Polymorph:c;Greater Invisibility:s;Banishment:c;Dimension Door:su;Wall of Fire:f;Fire Shield:f;Freedom of Movement:u;Death Ward:h;Arcane Eye:su;Locate Creature:u;Stoneskin:c;Compulsion:p',
5:'Cone of Cold:c;Wall of Force:cp;Greater Restoration:h;Raise Dead:h;Scrying:u;Teleportation Circle:u;Mislead:s;Hold Monster:cp;Flame Strike:f;Mass Cure Wounds:h;Dominate Person:p;Seeming:s',
6:'Chain Lightning:c;Disintegrate:c;Heal:h;True Seeing:u;Globe of Invulnerability:c;Mass Suggestion:p;Sunbeam:cf;Find the Path:u;Heroes\' Feast:h;Otto\'s Irresistible Dance:p',
7:'Teleport:u;Plane Shift:u;Finger of Death:c;Fire Storm:f;Regenerate:h;Resurrection:h;Etherealness:s;Delayed Blast Fireball:f;Forcecage:cp;Prismatic Spray:c',
8:'Sunburst:cf;Dominate Monster:p;Mind Blank:s;Feeblemind:c;Incendiary Cloud:f;Maze:p;Power Word Stun:c;Antimagic Field:u;Holy Aura:h',
9:'Wish:u;Meteor Swarm:fc;Time Stop:c;True Resurrection:h;Power Word Kill:c;Foresight:u;Mass Heal:h;Gate:u;Shapechange:c'
};
const ORD=['Cantrip','1st','2nd','3rd','4th','5th','6th','7th','8th','9th'];

const TIERS=[
 {id:'bronze',name:'Bronze',lv:'Basic',off:0,filler:1,mult:1},
 {id:'silver',name:'Silver',lv:'Good',off:.4,filler:1,mult:1.6},
 {id:'gold',name:'Gold',lv:'Great',off:.8,filler:2,mult:2.5},
 {id:'platinum',name:'Platinum',lv:'Excellent',off:1.25,filler:2,mult:4},
 {id:'legendary',name:'Legendary',lv:'Epic',off:1.75,filler:3,mult:6.5},
 {id:'celestial',name:'Celestial',lv:'Mythic',off:2.4,filler:3,mult:10}
];
// Party level sets the baseline power; the box tier is a quality step above it.
// Power is on the rarity scale: 0 mundane, 1 common, 2 uncommon, 3 rare, 4 very rare, 5 legendary.
function power(level,tier){return .3+(level-1)*.2+tier.off}
function gauss(c,sig){return RAR.map((_,i)=>Math.exp(-((i-c)**2)/(2*sig*sig)))}
function scaleTier(tierId,level){
  const t=TIERS.find(x=>x.id===tierId), raw=power(level,t), c=Math.min(raw,5);
  const key=gauss(c,.65), fill=gauss(Math.min(raw-.7,5),.85);
  const kl=key[5]; key[6]=raw>=6?kl*.3:0; fill[6]=0;
  return {...t,level,raw,key,fill};
}
const MAX_LEVEL=20;
function oddsText(tierId,level){
  const t=scaleTier(tierId,level), tot=t.key.reduce((a,b)=>a+b,0);
  const p=t.key.map((w,i)=>({r:RAR[i],p:Math.round(w/tot*100)})).filter(x=>x.p>=5).sort((a,b)=>b.p-a.p);
  return `At level ${level}, the main item in a ${t.name} box is `+p.map(x=>`${RNAME[x.r].toLowerCase()} ${x.p}%`).join(', ')+'.';
}

// pool: which items belong by default. slots: guaranteed picks. key slots use the tier's stronger rarity odds.
const BOXES=[
 {id:'adventurer',name:'Adventurer',blurb:'Healing, gear and useful magic for the road',coins:.5,spells:'uh',
  pool:{cats:['gear','heal','potion','scroll'],tags:['ut','qs','hl','dt']},
  slots:[{label:'Healing',cats:['heal']},{label:'Gear',cats:['gear']},{label:'Utility',tags:['ut','qs','dt'],key:1}]},
 {id:'apparel',name:'Apparel',blurb:'Clothes, cloaks, armor and other things you wear',coins:0,
  pool:{tags:['ap']},
  slots:[{label:'Wearable',tags:['ap'],key:1},{label:'Wearable',tags:['ap']}]},
 {id:'assassins',name:"Assassin's",blurb:'Stealth gear, poison and a quiet blade',coins:.5,spells:'s',
  pool:{cats:['poison'],tags:['st','fin']},
  slots:[{label:'Stealth',tags:['st'],notCats:['poison','wpn','mwpn','pet'],key:1},{label:'Poison',cats:['poison']},{label:'Blade',tags:['fin'],weapon:1}]},
 {id:'assholes',name:"Asshole's",blurb:'Curses, pranks, junk and a pile of copper',coins:'copper',
  pool:{cats:['junk'],tags:['cu','jk']},
  slots:[{label:'Curse',tags:['cu'],key:1},{label:'Junk',cats:['junk']},{label:'Junk',cats:['junk']},{label:'Consolation prize',any:1}],noFiller:1},
 {id:'boss',name:'Boss',blurb:'A big haul: a trophy item, magic, gems and art',coins:2,spells:'c',
  pool:{cats:MAGIC_CATS.concat(['gem','art'])},
  slots:[{label:'Trophy',magic:1,key:1,bump:1},{label:'Magic item',magic:1,key:1},{label:'Gem',cats:['gem'],key:1},{label:'Art object',cats:['art'],key:1}]},
 {id:'bounty',name:'Bounty',blurb:'Reward money plus gear for catching your mark',coins:2,spells:'pc',
  pool:{cats:['gem','heal'],tags:['bt','dt']},
  slots:[{label:'Capture',tags:['bt'],key:1},{label:'Tracking',tags:['dt']},{label:'Gem',cats:['gem'],key:1}]},
 {id:'brawlers',name:"Brawler's",blurb:'Strength, toughness and punching power',coins:.3,spells:'ch',
  pool:{cats:['heal'],tags:['bw']},
  slots:[{label:'Brawling',tags:['bw'],key:1},{label:'Healing',cats:['heal']},{label:'Combat boost',tags:['cbp'],cats:['heal']}]},
 {id:'crafters',name:"Crafter's",blurb:'Tools, raw materials and maker magic',coins:.3,spells:'u',
  pool:{cats:['tool','trade'],tags:['cr']},
  slots:[{label:'Tools',cats:['tool']},{label:'Materials',cats:['trade'],key:1},{label:"Maker's magic",tags:['cr'],magic:1,key:1}]},
 {id:'explosives',name:"Explosive's",blurb:'Things that go boom',coins:0,spells:'f',
  pool:{cats:['bomb'],tags:['ex']},
  slots:[{label:'Boom',tags:['ex'],key:1},{label:'Boom',tags:['ex']},{label:'Backup',cats:['bomb']}]},
 {id:'magic',name:'Magic Item',blurb:'Magic items of any kind',coins:0,
  pool:{cats:MAGIC_CATS},
  slots:[{label:'Magic item',magic:1,key:1},{label:'Magic item',magic:1}]},
 {id:'melee',name:'Melee Weapon',blurb:'A level-appropriate melee weapon plus combat supplies',coins:.3,spells:'ch',
  pool:{cats:['heal','armor','shield','mshield'],tags:['m','cbp']},
  slots:[{label:'Melee weapon',tags:['m'],weapon:1,key:1},{label:'Combat aid',cats:['heal'],tags:['cbp']}]},
 {id:'pacifists',name:"Pacifist's",blurb:'Protection, healing and ways to avoid a fight',coins:.5,spells:'ph',
  pool:{cats:['heal'],tags:['pc','hl']},
  slots:[{label:'Peacekeeper',tags:['pc'],key:1},{label:'Healing',cats:['heal']}]},
 {id:'pet',name:'Pet',blurb:'Animal companions, mounts and pet gear',coins:0,
  pool:{cats:['pet'],tags:['pt']},
  slots:[{label:'Companion',cats:['pet'],key:1},{label:'For your pet',tags:['pt'],notCats:['pet']}]},
 {id:'quest',name:'Quest',blurb:'Travel, navigation and finding what you need',coins:1,spells:'u',
  pool:{cats:['scroll'],tags:['qs','dt']},
  slots:[{label:'Travel',tags:['qs'],key:1},{label:'Discovery',tags:['dt']},{label:'Scroll',cats:['scroll']}]},
 {id:'ranged',name:'Ranged Weapon',blurb:'A level-appropriate ranged weapon, ammo and combat supplies',coins:.3,spells:'c',
  pool:{cats:['heal','ammo','mammo'],tags:['r','cbp']},
  slots:[{label:'Ranged weapon',tags:['r'],weapon:1,key:1},{label:'Ammunition',cats:['ammo','mammo']},{label:'Combat aid',cats:['heal'],tags:['cbp']}]},
 {id:'shoe',name:'Shoe',blurb:'Footwear. Only footwear.',coins:0,
  pool:{tags:['sh']},
  slots:[{label:'Footwear',tags:['sh'],key:1},{label:'Footwear',tags:['sh']}]},
 {id:'weapon',name:'Weapon',blurb:'Weapons of any kind, with ammo or oils',coins:.3,spells:'c',
  pool:{cats:['wpn','mwpn','ammo','mammo']},
  slots:[{label:'Weapon',tags:['m','r'],weapon:1,key:1},{label:'Weapon',tags:['m','r'],weapon:1},{label:'Extra',cats:['ammo','mammo'],tags:['cbp']}]}
];
const BOXMAP=Object.fromEntries(BOXES.map(b=>[b.id,b]));

/* ======================= PARSE ======================= */
function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
const BASE_ITEMS=[];(()=>{const seen=new Set();
 for(const line of RAW.split('\n')){ if(!line.trim())continue;
  const [name,r,cat,tags,extra,desc]=line.split('|');
  let id=slug(name); while(seen.has(id)) id+='-x'; seen.add(id);
  const it={id,name,r,cat,tags:tags?tags.split(','):[],desc:desc||'',hb:false};
  for(const x of (extra||'').split(',')){ if(!x)continue;
    if(x.startsWith('q:'))it.q=x.slice(2); else if(x.startsWith('b:'))it.base=x.slice(2);
    else if(x.startsWith('v:'))it.v=x.slice(2); else if(x.startsWith('lv:'))it.lv=+x.slice(3); else it.value=x; }
  it.src = PHB_OVERRIDE.has(name)?'PHB':BASIC_NAMES.has(name)?'Basic':(SRC_BY_CAT[cat]||'DMG');
  BASE_ITEMS.push(it);
 }})();
const WEAPON_TAGS=Object.fromEntries(BASE_ITEMS.filter(i=>i.cat==='wpn').map(i=>[i.name.replace(/s$/,''),i.tags]));
WEAPON_TAGS['Darts']=WEAPON_TAGS['Dart'];
const ALL_WEAPONS=BASE_ITEMS.filter(i=>i.cat==='wpn'&&i.name!=='Net'&&i.name!=='Darts').map(i=>i.name);


/* ======================= STATE ======================= */
// Homebrew items and table tweaks. The app sets these with setLootState().
let state={tweaks:{banned:[],removed:{},added:{}},homebrew:[]};
function allItems(){return BASE_ITEMS.concat(state.homebrew.map(h=>({...h,hb:true,src:'Homebrew',tags:h.tags||[],boxes:h.boxes||[]})))}
let ITEMS=allItems(), BYID=new Map(ITEMS.map(i=>[i.id,i]));
function rebuild(){ITEMS=allItems();BYID=new Map(ITEMS.map(i=>[i.id,i]))}
export function setLootState(s){state={tweaks:{banned:[],removed:{},added:{},...(s&&s.tweaks||{})},homebrew:(s&&s.homebrew)||[]};rebuild()}
const toast=()=>{};
/* ======================= RULES ======================= */
function matchSpec(it,spec){ if(!spec)return false;
  if(spec.cats&&spec.cats.includes(it.cat))return true;
  if(spec.tags&&it.tags.some(t=>spec.tags.includes(t)))return true; return false }
function inBox(it,boxId){
  const t=state.tweaks; if(t.banned.includes(it.id))return false;
  if((t.removed[boxId]||[]).includes(it.id))return false;
  if((t.added[boxId]||[]).includes(it.id))return true;
  if(it.hb) return (it.boxes||[]).includes(boxId);
  const b=BOXMAP[boxId]; if(matchSpec(it,b.pool))return true;
  return b.slots.some(s=>!s.any&&slotFits(it,s));
}
function slotFits(it,s){
  if(s.magic && !MAGIC_CATS.includes(it.cat))return false;
  if(s.weapon && !['wpn','mwpn'].includes(it.cat))return false;
  if(s.notCats && s.notCats.includes(it.cat))return false;
  if(!s.cats&&!s.tags)return true;
  return matchSpec(it,s);
}
function boxPool(boxId){return ITEMS.filter(i=>inBox(i,boxId))}

/* ======================= ROLLING ======================= */
const rnd=n=>Math.floor(Math.random()*n);
const pick=a=>a[rnd(a.length)];
function dice(expr){ if(!expr)return 1; const m=String(expr).match(/^(\d+)d(\d+)$/); if(!m)return +expr||1; let s=0; for(let i=0;i<+m[1];i++)s+=1+rnd(+m[2]); return s }
function weighted(w){const tot=w.reduce((a,b)=>a+b,0); if(!tot)return 0; let x=Math.random()*tot; for(let i=0;i<w.length;i++){x-=w[i]; if(x<0)return i} return w.length-1}

function pickFor(box,slot,tier,used,ctx){
  let w=(slot.key?tier.key:tier.fill).slice();
  if(slot.bump){ const b=Array(7).fill(0); w.forEach((v,i)=>{b[Math.min(6,i+slot.bump)]+=v}); w=b; }
  if(slot.magic) w[0]=0;
  const target=weighted(w);
  let cands = slot.any ? ITEMS.filter(i=>!state.tweaks.banned.includes(i.id)) : boxPool(box.id);
  cands=cands.filter(i=>!used.has(i.id) && (slot.any||!slot.filler?slotFits(i,slot):true));
  if(slot.magic) cands=cands.filter(i=>i.r!=='M');
  if(ctx&&ctx.ammo) cands=cands.filter(i=>(i.cat!=='ammo'||i.name===ctx.ammo)&&(i.id!=='arrow-of-slaying'||ctx.ammo==='Arrows'));
  if(!cands.length) return null;
  const by={}; for(const c of cands)(by[c.r]=by[c.r]||[]).push(c);
  // when the exact rarity is missing, better boxes round up and plain ones round down
  const up=slot.key&&tier.off>=1.25;
  const order=[target]; for(let d=1;d<7;d++){ if(up)order.push(target+d,target-d); else order.push(target-d,target+d) }
  for(const ri of order){ if(ri<0||ri>6)continue; const g=by[RAR[ri]]; if(g&&g.length) return g[rnd(g.length)]; }
  return null;
}
function ammoFor(w){ if(!w)return null; if(/Crossbow/.test(w))return 'Crossbow Bolts'; if(/bow$/.test(w))return 'Arrows'; if(w==='Sling')return 'Sling Bullets'; if(w==='Blowgun')return 'Blowgun Needles'; return null }
function makeEntry(it,slot,box,ctx){
  let name=it.name, extra='';
  // base weapon / armor
  let base=FIXED_BASE[it.name]||null;
  if(!base && it.base){
    let list = it.base==='w' ? ALL_WEAPONS.slice() : (BASES[it.base]||[]).slice();
    if(slot && slot.tags && (it.base==='w'||['s','ax','sa'].includes(it.base))){
      const want=slot.tags.filter(t=>['m','r','fin'].includes(t));
      if(want.length){ const f=list.filter(n=>(WEAPON_TAGS[n]||[]).some(t=>want.includes(t))); if(f.length)list=f; }
    }
    if(it.base==='ammo' && ctx && ctx.ammo) list=[ctx.ammo];
    else if(it.base==='ammo' && box && box.id==='assassins') list=['Blowgun Needles'];
    base=pick(list);
  }
  if(base && !FIXED_BASE[it.name]){
    if(/^(Weapon|Armor|Ammunition)\b/.test(name)) name=name.replace(/^(Weapon|Armor|Ammunition)/,base);
    else name+=` (${base})`;
  }
  if(it.v){ name+=` (${pick(VARIANTS[it.v])})`; }
  if(it.lv!=null){
    const list=SPELLS[it.lv].split(';').map(s=>{const [n,t]=s.split(':');return{n,t}});
    const pref=(box&&box.spells)||''; let pool=list.filter(s=>[...pref].some(c=>s.t.includes(c)));
    if(!pool.length||Math.random()<.25) pool=list;
    const sp=pick(pool); name=`Spell Scroll: ${sp.n}`; extra=it.lv===0?'Cantrip':`${ORD[it.lv]}-level spell`;
  }
  if(ctx && !ctx.ammo){ const w=base||(it.cat==='wpn'?it.name:null); const a=ammoFor(w); if(a) ctx.ammo=a; }
  const q=dice(it.q);
  return {id:it.id,name,r:it.r,cat:it.cat,desc:it.desc,value:it.value,src:it.src,q,extra,slot:slot?slot.label:'Bonus',slotRef:slot};
}
function rollCoins(box,tier){
  if(!box.coins)return null;
  // about 30 gp at level 1, ~700 at 10, ~24,000 at 20 for a bronze box; tiers multiply it
  let gp=30*Math.pow(1.42,tier.level-1)*tier.mult*dice('2d6')/7;
  if(box.coins==='copper'){ const cp=Math.round(gp*(1+rnd(3))); return {copper:cp} }
  gp=Math.max(1,Math.round(gp*box.coins)); if(gp>100)gp=Math.round(gp/5)*5;
  let pp=0; if(gp>=500){ pp=Math.round(gp*.1/10); gp-=pp*10; }
  let sp=gp<60?dice('3d6')*(box.coins>=1?2:1):0;
  return {gp,pp,sp};
}
function openBox(boxId,tierId,level){
  const box=BOXMAP[boxId], tier=scaleTier(tierId,level); const used=new Set(); const items=[]; const ctx={};
  for(const s of box.slots){ const it=pickFor(box,s,tier,used,ctx); if(it){used.add(it.id); items.push(makeEntry(it,s,box,ctx));} }
  // homebrew & extras: filler from whole pool
  if(!box.noFiller){ for(let i=0;i<tier.filler;i++){ const s={label:'Bonus',filler:1}; const it=pickFor(box,s,tier,used,ctx); if(it){used.add(it.id); items.push(makeEntry(it,s,box,ctx));} } }
  return {box:boxId,tier:tierId,level,items,ctx,coins:rollCoins(box,tier),at:Date.now()};
}
function rerollAt(res,idx){
  const box=BOXMAP[res.box], tier=scaleTier(res.tier,res.level||1);
  const used=new Set(res.items.map(i=>i.id)); const old=res.items[idx]; const s=old.slotRef||{label:old.slot,filler:1};
  const ctx=res.ctx||{}; if(s.weapon) delete ctx.ammo;
  const it=pickFor(box,s,tier,used,ctx); if(!it){toast('Nothing else fits that slot.');return}
  res.items[idx]=makeEntry(it,s,box,ctx);
}

export function lootItems(){return ITEMS}
export { RAR, RNAME, CATS, TIERS, BOXES, BOXMAP, MAGIC_CATS, openBox, rerollAt, oddsText, MAX_LEVEL };
