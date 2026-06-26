#!/usr/bin/env node

/**
 * Update department (Organization) for existing FLG employees.
 * Upserts by employee_id: updates name + department if exists, inserts if missing.
 *
 * Usage: node scripts/update-flg-employee-departments.js
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
FLG1911003	Jiem Ilham	Product Development
FLG2111005	Doni Daoni Hasintongan Nababan	Production
FLG2112006	Iendah Shofwatun Nisa	Production
FLG2204003	Muhammad Mahfudz Fahd	Logistic
FLG2205004	Juvita Nilasari	Logistic
FLG2206009	Puput Wijanarko	Production
FLG2208012	Johan Santoso	Supply Chain
FLG2211018	Tafizia Rachman	Logistic
FLG2203002	Zulfi Habibizul	Product Development
FLG2109003	Bagas Prasetya	Production
FLG2012005	Faliq Humam Zulian	Production
FLG2102001	Ilyas Safiq	Production
FLG2012004	Hikmatul Iman	Production
FLG2302011	Rocy Vernando	Production
FLG2302012	Ardani bin akmad	Production
FLG2302013	Rohiah Rohiah	Production
FLG2302014	Qurotul Aini	Production
FLG2302015	Thania Novelia Suseno	Production
FLG2303026	Aprilia Ambarwati Supardi	Production
FLG2304028	Muhammad Irsan Kurniawan	Production
FLG2305038	Linda Apriliani	Finance and Accounting
FLG2305040	Leonardo Dwiki Bagaskara	Logistic
FLG2306050	Dely Dasuni	Production
FLG2306052	Muhamad Oky	Logistic
FLG2309057	Reza Abi Wibowo	Logistic
FLG2310064	Muhammad Farhan Erdiansyah	CEO Office
FLG2310068	Andrean	Production
FLG2310073	Monica Dwi Nouraini	Logistic
FLG2310075	Putri Aisyah Fitri Wulandari	Finance and Accounting
FLG2311066	Wahyu Pratama Azviandika	Logistic
FLG2312069	Damar Ikhsan Priredana	Product Development
FLG2401075	Bowo Linandi	Logistic
FLG2401078	Decky Cornelis Saputra	Logistic
FLG2401080	Maulana Daffa Hilmi Sujito	Production
FLG2402084	Halpi Noviandi	Production
FLG2402089	Abdul Patah	Logistic
FLG2402090	Imron Fajar	Logistic
FLG2403093	Ikhsanudin Nur Rosyidi	Product Development
FLG2404108	Muhammad Rizqy Sobary	Logistic
FLG2404114	Heidar	Production
FLG2405120	Yosyta Amalya Khorifah	Logistic
FLG2405121	Damaris Gunawan	Logistic
FLG2405122	Dela Wahyu Handayani	Production
FLG2405123	Wijayanti	Production
FLG2405124	Nadya Evana	Finance and Accounting
FLG2405126	Teddy Prastanta	Production
FLG2405128	Moh. Bahrul Hidayat	Logistic
FLG2407135	Rizal Ardiansyah	Logistic
FLG2407136	Renaldi Alamsyah	Product Development
FLG2408140	Lanang Rachmadi	Product Development
FLG2410143	Ahmad Wildan Shidqi	Logistic
FLG2411147	AJENG CHRISTINA ABIGAIL	Supply Chain
FLG2501149	AMIRAL NUR ROHMA PUTRI H	Production
FLG2501153	Muhammad Farhan Ismail	Supply Chain
FLG2501157	Wayan Mariyanto	Logistic
FLG2502159	Sandika Prabukusuma Santoso	Research & Development
FLG25022310161	Muhammad Rifaldi	Logistic
FLG25022310164	Fandi Prayoga Efendi	Production
FLG2503171	Lupita Arlianti Labuda	Logistic
FLG25042310169	Muhammad Daffa Rizky Kurniadi	Logistic
FLG25042310172	Evan Wiratama	Production
FLG25042310175	Krisanti Ramadiani	Logistic
FLG2505177	Ardiyansyah	Production
FLG25052310177	Permana Apriatna	Production
FLG2505178	Ajai Binsabil	Production
FLG25052310178	Hilal Akbar Quddus Ramadhan	Production
FLG25052310180	HANI TUTI HANDAYANI	Logistic
FLG25062310182	BAGAS ALFA RIZKI	Logistic
FLG25062310184	Fhauzi Kurniawan	Logistic
FLG25062310185	Agung Prasetyo	Logistic
FLG25062310187	Muhamad Lutfi	Logistic
FLG2506189	Muhammad Eka Alfaridzi	Logistic
FLG25062310189	Fathurrohman	Logistic
FLG25072310190	Hamka Fathin	Product Development
FLG2507191	Aditya Kalandoro	Production
FLG25072310195	Ridha Maulana	Product Development
FLG25082310203	Gea Aryo Wijanarko	Logistic
FLG25082310204	Debby Cyntia Dewi Sirait	Production
FLG25082310205	Putri Azzahra	Production
FLG25082310207	Riki Irwandi	Logistic
FLG25082310208	Pramas Setya Wahyu	Logistic
FLG25082310210	Dadang Ramadhan	Product Development
FLG25082310212	Atsal Muhammad Akbar	Production
FLG25082310213	Diky Lukman Hakim	Logistic
FLG25082310215	Muhamad Nadliful Azhar	Logistic
FLG25082310216	Aditya Septian	Logistic
FLG25092310217	Adhari Wijaya	Production
FLG25092310219	Bartolomeus Harjuna Wibawa	Logistic
FLG2509220	Noel Rolando Orosa	Supply Chain
FLG25092310222	Frebyandika Dwima Putra	Logistic
FLG25092310223	Novreza Fransiska	Logistic
FLG2507198	Subhan Hidayat	HR
FLG25092310225	Astikaria	Production
FLG25092310226	Farhan Rizky Wahyudi	Production
FLG25092310227	Calvin Lama Tokan	Production
FLG25092310228	Damar Kresna Ali	Logistic
FLG25092310229	Amaniah Nadhifah	Product Development
FLG25092310232	Alvana Noor Fariza Setiowati	Logistic
FLG25092310235	Hudio Wisnugroho	Logistic
FLG25102310238	Erza Fanan Nafidza	Product Development
FLG25102310240	Mochamad Diki Muliyawan	Production
FLG26042310288	Niszamuddin El Chair	Product Development
FLG26022310280	Indah Rinawati	Supply Chain
FLG2603287	Raden Praditya Andika Putra	Product Development
FLG26042310290	Isnaeni Fajar	Product Development
`;

function parseRows(data) {
  const rows = [];
  for (const line of data.trim().split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\t+/);
    if (parts.length < 3) {
      console.warn(`Skip invalid line: ${trimmed}`);
      continue;
    }
    rows.push({
      employee_id: parts[0].trim(),
      name: parts[1].trim(),
      department: parts.slice(2).join(' ').trim(),
    });
  }
  return rows;
}

async function main() {
  const employees = parseRows(employeeData);
  console.log(`Processing ${employees.length} employees...\n`);

  let updated = 0;
  let inserted = 0;
  let errors = 0;

  await pool.query('SELECT 1');

  for (const emp of employees) {
    try {
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
        console.log(`Inserted new: ${emp.employee_id} — ${emp.name}`);
      }
    } catch (err) {
      errors++;
      console.error(`Error for ${emp.employee_id}:`, err.message);
    }
  }

  const countResult = await pool.query('SELECT COUNT(*) AS count FROM employee_data');
  console.log('\n=== Summary ===');
  console.log(`Updated existing: ${updated}`);
  console.log(`Inserted new:     ${inserted}`);
  console.log(`Errors:           ${errors}`);
  console.log(`Total in DB:      ${countResult.rows[0].count}`);
}

main()
  .catch((err) => {
    console.error('Fatal:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
