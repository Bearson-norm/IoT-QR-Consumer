#!/usr/bin/env node

/**
 * Upsert HL employee data (name + department).
 * #N/A department values are stored as empty string.
 *
 * Usage: node scripts/update-hl-employee-departments.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'iot_qr_consumer',
});

const employeeData = `
HL210706001	Sadah	Production
HL211001002	Mahardika	Production
HL220301003	Martunis Hidayatulloh	Production
HL220501004	Siti Sopiah	Production
HL220601005	Nurbaiti	Production
HL220601006	Windi Nur Azizah	Production
HL220601007	Anisa Putri Ramadani	Production
HL221001008	Muhammad Abdul Halim	Production
HL230201009	Sharani Noor Padilah	Production
HL230101010	Irma Anggraeni	Production
HL230101011	Rini Rokhimah	Production
HL231001012	Euis Santi	Production
HL230101013	Heni Lisnawati	Production
HL230102014	Heriyanto	Logistic
HL230101015	Iin silpiana Dewi	Production
HL230101016	Laras Wati	Production
HL230101017	Rendy Join Prayoga Hutapea	Production
HL230101018	Rizqi Mahendra	Production
HL230201019	Muhammad Agung Wijaya	Production
HL230201020	Novita Astriani	Production
HL230306021	Erwin Saputra	Production
HL230301022	Laila Arifatul Hilmi	Production
HL230302023	M. Yuzar Alghazali	Logistic
HL230301024	Devi Yanti	Production
HL230301025	Ganjar Ferdianto	Production
HL230301027	Yuyun	Production
HL230301028	Adi Rohadi	Logistic
HL230301029	Ahmad Buseri	Production
HL230301031	Fita Estikasari	Product Development
HL230301030	Syahrizal Alfin Saputro	Production
HL230401033	Diah Ayu Novianti	Production
HL230401034	Dwi Setia Putri	Production
HL230401035	Siti Hasanah	Production
HL230401036	Vita Lativa	Production
HL230401037	Andri Mulyadi	Production
HL230502038	Christian Yohanes Tili Nino	Logistic
HL230501039	Frisca Nurjannah	Production
HL230501040	Linda Haryati	Production
HL230801041	Ahmad Muhaimin	Production
HL230801042	Indadari Windrayanti	Production
HL230901043	Nurul Khofiduriah	Production
HL231001044	Pria Nanda Pratama	Production
HL231101045	Gista Nadia	Production
HL231101046	Ita Purnamasari	Production
HL231101047	Parjiyanti	Production
HL231201048	Selly Juniar Andriyani	Production
HL231201049	Jonathan Claudio P	Production
HL231202050	Adelia Putri Fatimah	Logistic
HL240101051	Andre Romadoni	Production
HL240101052	Iin Rofizah	Production
HL240101053	Krisna agung Nugroho	Production
HL240101054	Sopiyana	Production
HL240101055	Tiaruli Nababan	Production
HL240301056	Mamat	Production
HL240301057	Dora Nopinda	Production
HL240301058	Rifki Maulana Rafif	Production
HL240301059	Ranti Anjani Dewi	#N/A
HL240402060	Andika Saputra	Logistic
HL240402061	Muhammad Tazzudin	#N/A
HL240501062	Evi Dwi Setiani	Production
HL240501063	Sri hoviya	Production
HL240506064	Hariyanto	Production
HL240501065	Hendra Azwar Eka Saputra	Production
HL240601066	Ahmad Ari Ripa'i	Production
HL240601067	Muhammad Ilham	Production
HL240701068	Aditya Rachman	Production
HL240701069	Muhammad Tedi Al Bukhori	Production
HL240802070	Sarmin Wance	Logistic
HL240901071	Muhammad Apandi	Production
HL240901072	Adam Rizki	Production
HL240901073	Dede Mustika Alawiah	Production
HL240901074	Muhammad Alfiana	Production
HL240901075	Muhammad Irfan Perdinan	Production
HL240901076	Sevira Yunita Andini	Production
HL240901077	Yati Sumiati	Product Development
HL240901078	Yusup Supriyana	Production
HL241106079	Siti Haryanti	Production
HL241102080	Christiano Steven Gerrad Rumahorbo	Logistic
HL241101081	Erfild Ardi Mahardika	Production
HL241101082	Guntur Adi Putra	Logistic
HL241101083	Muhammad Hafizh Fauzan	Logistic
HL241101084	Suganda	#N/A
HL241101085	Syahrizal	Production
HL241101086	Tomi Wijaya	Production
HL241101087	Fathurrohman	#N/A
HL241201088	Jalaluddin Rahmat	#N/A
HL250101089	Rizky Septian	Production
HL250102090	Muhammad Ridwan	Logistic
HL250102091	Andhika Radiyatama	Logistic
HL250101092	Galing Resdianto	Production
HL250101093	Putri Bela Savira	Production
HL250101094	Sherly Triananda Lisa	Production
HL250101095	Teguh Santoso	Production
HL250202096	Fajar Prihatna	Logistic
HL250202097	Faizal Asmi Bakhtiar	Logistic
HL250202098	Kevin Saputra	Logistic
HL250401099	Vini Claras Anatasyia	Production
HL250401100	Dwi Nova Safitri	Production
HL250401102	Hermawan	Production
HL250401101	Nur Azizah	Production
HL250401103	Saepurohman	#N/A
HL250402104	Alan Setia Kencana	Logistic
HL250406105	Radela Farellino Eldi Gandi	Production
HL250401106	Henry Daniarto	Production
HL250401107	Inka Purnama Sari	Production
HL250401108	Larasati	Production
HL250401109	Sindy Yusnia	Production
HL250401110	Adi Ardiansyah	Production
HL250401111	Muhamad Hojaji Muslim	Production
HL250401112	Sahroni	Production
HL250401113	Widi Dwi Gita	Production
HL250502114	Hendrick Simarmata	Logistic
HL250502115	Iqbal Raka Putra	Logistic
HL250501116	Aulia Rachma Putri	Production
HL250501117	Dini Milati	Production
HL250501118	Mayang Puspitaningrum	Production
HL250501119	Muhammad Haffiudin	#N/A
HL250501120	Niken Susanti	Production
HL250501121	Norris Samuel Silaban	Production
HL250501122	Nurul Amelia	Production
HL250506123	Panisih	Production
HL250501124	Randy Virmansyah	Production
HL250501125	Rusnia Ningsih	Production
HL250501126	Siti mahidah	Production
HL250501127	Sofhie angellita	Production
HL250501128	Ubedilah	Production
HL250501129	Zimam Mulhakam	Production
HL250501130	Hanun Dhiya Imtiaz	Production
HL250502131	Muhammad Faisal	Production
HL250602132	Andri Permana	Logistic
HL250602133	Rizki Ahmad Sopyan	#N/A
HL250602134	Wahyu Muzidan	Logistic
HL250601134	Annisa Rahmawati	Production
HL250601136	Armah Wati	Production
HL250601135	Dessy Indriyani	Production
HL250601137	Meitya Rifai Yusnah	Production
HL250601138	Muhammad Hafis	#N/A
HL250601139	Nurhadi	Production
HL250601140	Silvia Fransiska	Production
HL250601141	Suhendra jaya Kusuma	Production
HL250601142	Yuliyanti Putri Pratiwi	Production
HL250602144	Muhamad Septian	Logistic
HL250601143	Muhammad Rizky Julian	Logistic
HL250602145	Aripin	Logistic
HL250602146	Eki Candra	Logistic
HL250602147	Malik Abdul Aziz	#N/A
HL250702148	Aditya Saepul Rohman	Logistic
HL250704149	Rizki Oktafirmansyah	Product Development
HL250704150	Amanda Tifara	Production
HL250704151	Oky	#N/A
HL251004152	Rizky Fadillah	Product Development
HL251004153	Rismawati	Production
HL251004154	Chica Melani Azizah	Production
HL251004155	Restira Nadra	Production
HL251004156	Aprizal	Production
HL251004157	Dita Santiara	Production
HL251004158	Eka Pratiwi	Production
HL251004159	Ahmad Dira Saputra	Production
HL251004160	Imam Priyadi	Production
HL251004161	Revania Ai Zhafirah	Production
HL251004162	Siti Selvi Nurviani	Production
HL251004163	Bayu Permana	Production
HL251004164	Aulya Sesilia Febryanti Hutapea	Production
HL251004165	Unadi Saputra	Logistic
HL251004166	Yoga Saputra	Logistic
HL251004167	Muhammad Farhan	Logistic
HL251004168	Elsa Sulaeman	Production
HL251004169	Sri Wulandari	Production
HL251004170	Sulistiawati	Production
HL251004171	Sadam Husein	Production
HL251004172	Galih Fahrul Roji	Production
HL251004173	Fauziatu Rahmah	Production
HL251004174	Farras Nur Aulia	Production
HL251004175	Revly Mutiara Cantik	Production
HL251004176	Agi Cahyadi	Production
HL251004177	Rahmat Saputra	Production
HL251004178	Ika Purnama	Production
HL251004179	Agung Setya Budi	Production
HL251004180	Rudi Irma	Production
HL251004181	Nuril Mubin	Production
HL251004182	Iim Komala	Logistic
HL251004183	Arbela	Production
HL251004184	Muhamad Mashur	Production
HL251004185	Bernard Jonathan	Logistic
HL251004186	Desi Antika	Production
HL251004187	Devi Amelia	Production
HL251004188	Ferdi	Production
HL251004189	Muhtadi	Production
HL251004190	Agustinus Pedro Sitorus	Production
HL251004191	Zanuar Hairu Pamungkas	Logistic
HL251004192	Udin Winata	Logistic
HL251004193	Muhammad Fazeli	Logistic
HL251004194	Agus Romdaniasyah	Logistic
HL251004195	Opik Kosasih	Logistic
HL251004196	Diki Awaludin	Production
HL251004197	Nevin Fernaldi Cung	Product Development
`;

function normalizeDepartment(value) {
  const dept = (value || '').trim();
  if (!dept || dept.toUpperCase() === '#N/A' || dept.toUpperCase() === 'N/A') {
    return '';
  }
  return dept;
}

function parseRows(data) {
  const rows = [];
  for (const line of data.trim().split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\t+/);
    if (parts.length < 2) {
      console.warn(`Skip invalid line: ${trimmed}`);
      continue;
    }
    const employee_id = parts[0].trim();
    const name = parts[1].trim();
    const department = parts.length >= 3 ? normalizeDepartment(parts[2]) : '';
    if (!employee_id || !name) {
      console.warn(`Skip incomplete line: ${trimmed}`);
      continue;
    }
    rows.push({ employee_id, name, department });
  }
  return rows;
}

async function main() {
  const employees = parseRows(employeeData);
  console.log(`Processing ${employees.length} HL employees...\n`);

  let updated = 0;
  let inserted = 0;
  let emptyDept = 0;
  let errors = 0;

  await pool.query('SELECT 1');

  for (const emp of employees) {
    try {
      if (!emp.department) emptyDept++;

      const existing = await pool.query(
        'SELECT employee_id FROM employee_data WHERE employee_id = $1',
        [emp.employee_id]
      );

      await pool.query(
        `INSERT INTO employee_data (employee_id, name, department)
         VALUES ($1, $2, $3)
         ON CONFLICT (employee_id) DO UPDATE SET
           name = EXCLUDED.name,
           department = EXCLUDED.department`,
        [emp.employee_id, emp.name, emp.department]
      );

      if (existing.rows.length > 0) {
        updated++;
      } else {
        inserted++;
        console.log(`Inserted: ${emp.employee_id} — ${emp.name}`);
      }
    } catch (err) {
      errors++;
      console.error(`Error for ${emp.employee_id}:`, err.message);
    }
  }

  const countResult = await pool.query('SELECT COUNT(*) AS count FROM employee_data');
  console.log('\n=== Summary ===');
  console.log(`Updated existing:  ${updated}`);
  console.log(`Inserted new:      ${inserted}`);
  console.log(`Empty department:  ${emptyDept}`);
  console.log(`Errors:            ${errors}`);
  console.log(`Total in DB:       ${countResult.rows[0].count}`);
}

main()
  .catch((err) => {
    console.error('Fatal:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
