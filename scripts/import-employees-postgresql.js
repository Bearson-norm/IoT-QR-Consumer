#!/usr/bin/env node

/**
 * Script untuk import employee data ke PostgreSQL
 * Menggunakan data employee yang sama dengan import-employees.js
 * 
 * Usage: node scripts/import-employees-postgresql.js
 */

const { Pool } = require('pg');

// PostgreSQL connection configuration
const pool = new Pool({
  user: 'admin',
  password: 'admin123',
  host: 'localhost',
  port: 5432,
  database: 'iot_qr_consumer',
});

// Employee data from user
const employeeData = `
HL210706001	Sadah
HL211001002	Mahardika
	Calvin Lama Tokan
HL220301003	Martunis Hidayatulloh
HL220501004	Siti Sopiah
HL220601005	Nurbaiti
HL220601006	Windi Nur Azizah
HL220601007	Anisa Putri Ramadani
	Farhan Rizky Wahyudi
HL221001008	Muhammad Abdul Halim
HL230201009	Sharani Noor Padilah
HL230101010	Irma Anggraeni
HL230101011	Rini Rokhimah
HL231001012	Euis Santi
HL230101013	Heni Lisnawati
HL230102014	Heriyanto
HL230101015	Iin silpiana Dewi
HL230101016	Laras Wati
HL230101017	Rendy Join Prayoga Hutapea
HL230101018	Rizqi Mahendra
HL230201019	Muhammad Agung Wijaya
HL230201020	Novita Astriani
HL230306021	Erwin Saputra
HL230301022	Laila Arifatul Hilmi
HL230302023	M. Yuzar Alghazali
HL230301024	Devi Yanti
HL230301025	Ganjar Ferdianto
HL230301026	Nurul Sifa
HL230301027	Yuyun
HL230301028	Adi Rohadi
HL230301029	Ahmad Buseri
HL230301031	Fita Estikasari
HL230301030	Syahrizal Alfin Saputro
HL230402032	Damaris Gunawan
HL230401033	Diah Ayu Novianti
HL230401034	Dwi Setia Putri
HL230401035	Siti Hasanah
HL230401036	Vita Lativa
HL230401037	Andri Mulyadi
HL230502038	Christian Yohanes Tili Nino
HL230501039	Frisca Nurjannah
HL230501040	Linda Haryati
	Yosyta Amalya Khorifah
HL230801041	Ahmad Muhaimin
HL230801042	Indadari Windrayanti
HL230901043	Nurul Khofiduriah
HL231001044	Pria Nanda Pratama
HL231101045	Gista Nadia
HL231101046	Ita Purnamasari
HL231101047	Parjiyanti
HL231201048	Selly Juniar Andriyani
HL231201049	Jonathan Claudio P
HL231202050	Adelia Putri Fatimah
HL240101051	Andre Romadoni
HL240101052	Iin Rofizah
HL240101053	Krisna agung Nugroho
HL240101054	Sopiyana
HL240101055	Tiaruli Nababan
HL240301056	Mamat
HL240301057	Dora Nopinda
HL240301058	Rifki Maulana Rafif
HL240301059	Ranti Anjani Dewi
HL240402060	Andika Saputra
HL240402061	Muhammad Tazzudin
HL240501062	Evi Dwi Setiani
HL240501063	Sri hoviya
HL240506064	Hariyanto
HL240501065	Hendra Azwar Eka Saputra
HL240601066	Ahmad Ari Ripa'i
HL240601067	Muhammad Ilham
HL240701068	Aditya Rachman
HL240701069	Muhammad Tedi Al Bukhori
HL240802070	Sarmin Wance
HL240901071	Muhammad Apandi
HL240901072	Adam Rizki
HL240901073	Dede Mustika Alawiah
HL240901074	Muhammad Alfiana
HL240901075	Muhammad Irfan Perdinan
HL240901076	Sevira Yunita Andini
HL240901077	Yati Sumiati
HL240901078	Yusup Supriyana
HL241106079	Siti Haryanti
HL241102080	Christiano Steven Gerrad Rumahorbo
HL241101081	Erfild Ardi Mahardika
HL241101082	Guntur Adi Putra
HL241101083	Muhammad Hafizh Fauzan
HL241101084	Suganda
HL241101085	Syahrizal
HL241101086	Tomi Wijaya
HL241101087	Fathurrohman
HL241201088	Jalaluddin Rahmat
HL250101089	Rizky Septian
	Kresna Damar Ali
HL250102090	Muhammad Ridwan
HL250102091	Andhika Radiyatama
HL250101092	Galing Resdianto
HL250101093	Putri Bela Savira
HL250101094	Sherly Triananda Lisa
HL250101095	Teguh Santoso
HL250202096	Fajar Prihatna
HL250202097	Faizal Asmi Bakhtiar
HL250202098	Kevin Saputra
HL250401099	Vini Claras Anatasyia
HL250401100	Dwi Nova Safitri
HL250401102	Hermawan
HL250401101	Nur Azizah
HL250401103	Saepurohman
HL250402104	Alan Setia Kencana
HL250406105	Radela Farellino Eldi Gandi
HL250401106	Henry Daniarto
HL250401107	Inka Purnama Sari
HL250401108	Larasati
HL250401109	Sindy Yusnia
HL250401110	Adi Ardiansyah
HL250401111	Muhamad Hojaji Muslim
HL250401112	Sahroni
HL250401113	Widi Dwi Gita
HL250502114	Hendrick Simarmata
HL250502115	Iqbal Raka Putra
HL250501116	Aulia Rachma Putri
HL250501117	Dini Milati
HL250501118	Mayang Puspitaningrum
HL250501119	Muhammad Haffiudin
HL250501120	Niken Susanti
HL250501121	Norris Samuel Silaban
HL250501122	Nurul Amelia
HL250506123	Panisih
HL250501124	Randy Virmansyah
HL250501125	Rusnia Ningsih
HL250501126	Siti mahidah
HL250501127	Sofhie angellita
HL250501128	Ubedilah
HL250501129	Zimam Mulhakam
HL250501130	Hanun Dhiya Imtiaz
HL250502131	Muhammad Faisal
HL250602132	Andri Permana
HL250602133	Rizki Ahmad Sopyan
HL250602134	Wahyu Muzidan
HL250601134	Annisa Rahmawati
HL250601136	Armah Wati
HL250601135	Dessy Indriyani
HL250601137	Meitya Rifai Yusnah
HL250601138	Muhammad Hafis
HL250601139	Nurhadi
HL250601140	Silvia Fransiska
HL250601141	Suhendra jaya Kusuma
HL250601142	Yuliyanti Putri Pratiwi
HL250602144	Muhamad Septian
HL250601143	Muhammad Rizky Julian
HL250602145	Aripin
HL250602146	Eki Candra
HL250602147	Malik Abdul Aziz
HL250702148	Aditya Saepul Rohman
HL250704149	Rizki Oktafirmansyah
HL250704150	Amanda Tifara
HL250704151	Oky
FLG1911003	Jiem Ilham
FLG2111005	Doni Daoni Hasintongan Nababan
FLG2112006	Iendah Shofwatun Nisa
FLG2204003	Muhammad Mahfudz Fahd
FLG2205004	Juvita Nilasari
FLG2206009	Puput Wijanarko
FLG2208012	Johan Santoso
FLG2211018	Tafizia Rachman
FLG2203002	Zulfi Habibizul
FLG2109003	Bagas Prasetya
FLG2012005	Faliq Humam Zulian
FLG2102001	Ilyas Safiq
FLG2012004	Hikmatul Iman
FLG2302011	Rocy Vernando
FLG2302012	Ardani bin akmad
FLG2302013	Rohiah Rohiah
FLG2302014	Qurotul Aini
FLG2302015	Thania Novelia Suseno
FLG2303026	Aprilia Ambarwati Supardi
FLG2304028	Muhammad Irsan Kurniawan
FLG2305038	Linda Apriliani
FLG2305040	Leonardo Dwiki Bagaskara
FLG2306050	Dely Dasuni
FLG2306052	Muhamad Oky
FLG2309057	Reza Abi Wibowo
FLG2310064	Muhammad Farhan Erdiansyah
FLG2310068	Andrean
FLG2310073	Monica Dwi Nouraini
FLG2310075	Putri Aisyah Fitri Wulandari
FLG2311066	Wahyu Pratama Azviandika
FLG2312069	Damar Ikhsan Priredana
FLG2401075	Bowo Linandi
FLG2401078	Decky Cornelis Saputra
FLG2401080	Maulana Daffa Hilmi Sujito
FLG2402084	Halpi Noviandi
FLG2402089	Abdul Patah
FLG2402090	Imron Fajar
FLG2403093	Ikhsanudin Nur Rosyidi
FLG2404108	Muhammad Rizqy Sobary
FLG2404114	Heidar
FLG2405120	Yosyta Amalya Khorifah
FLG2405121	Damaris Gunawan
FLG2405122	Dela Wahyu Handayani
FLG2405123	Wijayanti
FLG2405124	Nadya Evana
FLG2405126	Teddy Prastanta
FLG2405128	Moh. Bahrul Hidayat
FLG2407135	Rizal Ardiansyah
FLG2407136	Renaldi Alamsyah
FLG2408140	Lanang Rachmadi
FLG2410143	Ahmad Wildan Shidqi
FLG2411147	AJENG CHRISTINA ABIGAIL
FLG2501149	AMIRAL NUR ROHMA PUTRI H
FLG2501153	Muhammad Farhan Ismail
FLG2501157	Wayan Mariyanto
FLG2502159	Sandika Prabukusuma Santoso
FLG25022310161	Muhammad Rifaldi
FLG25022310164	Fandi Prayoga Efendi
FLG2503171	Lupita Arlianti Labuda
FLG25042310169	Muhammad Daffa Rizky Kurniadi
FLG25042310172	Evan Wiratama
FLG25042310175	Krisanti Ramadiani
FLG2505177	Ardiyansyah
FLG25052310177	Permana Apriatna
FLG2505178	Ajai Binsabil
FLG25052310178	Hilal Akbar Quddus Ramadhan
FLG25052310180	HANI TUTI HANDAYANI
FLG25062310182	BAGAS ALFA RIZKI
FLG25062310184	Fhauzi Kurniawan
FLG25062310185	Agung Prasetyo
FLG25062310187	Muhamad Lutfi
FLG2506189	Muhammad Eka Alfaridzi
FLG25062310189	Fathurrohman
FLG25072310190	Hamka Fathin
FLG2507191	Aditya Kalandoro
FLG25072310195	Ridha Maulana
FLG25082310203	Gea Aryo Wijanarko
FLG25082310204	Debby Cyntia Dewi Sirait
FLG25082310205	Putri Azzahra
FLG25082310207	Riki Irwandi
FLG25082310208	Pramas Setya Wahyu
FLG25082310210	Dadang Ramadhan
FLG25082310212	Atsal Muhammad Akbar
FLG25082310213	Diky Lukman Hakim
FLG25082310215	Muhamad Nadliful Azhar
FLG25082310216	Aditya Septian
FLG25092310217	Adhari Wijaya
FLG25092310219	Bartolomeus Harjuna Wibawa
FLG2509220	Noel Rolando Orosa
FLG25092310222	Frebyandika Dwima Putra
FLG25092310223	Novreza Fransiska
FLG2507198	Subhan Hidayat
FLG25092310225	Astikaria
FLG25092310226	Farhan Rizky Wahyudi
FLG25092310227	Calvin Lama Tokan
FLG25092310228	Damar Kresna Ali
FLG25092310229	Amaniah Nadhifah
FLG25092310232	Alvana Noor Fariza Setiowati
FLG25092310235	Hudio Wisnugroho
FLG25102310238	Erza Fanan Nafidza
FLG25102310240	Mochamad Diki Muliyawan
`;

// Parse employee data
function parseEmployeeData(data) {
  const lines = data.trim().split('\n');
  const employees = [];
  let lastEmployeeId = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Split by tab or multiple spaces
    const parts = trimmed.split(/\t+/).filter(p => p.trim());
    
    if (parts.length >= 2) {
      // Has employee_id and name
      const employeeId = parts[0].trim();
      const name = parts.slice(1).join(' ').trim();
      if (employeeId && name) {
        employees.push({ employee_id: employeeId, name: name });
        lastEmployeeId = employeeId;
      }
    } else if (parts.length === 1) {
      // Only name (no employee_id) - skip
      console.log(`Skipping entry without employee_id: ${parts[0]}`);
    }
  }

  return employees;
}

// Import employees to PostgreSQL database
async function importEmployees() {
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✓ Connected to PostgreSQL database\n');
    
    const employees = parseEmployeeData(employeeData);
    console.log(`Parsed ${employees.length} employees\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // Import employees one by one
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      
      try {
        // Use ON CONFLICT DO NOTHING to skip duplicates (PostgreSQL equivalent of INSERT OR IGNORE)
        const result = await pool.query(
          'INSERT INTO employee_data (employee_id, name) VALUES ($1, $2) ON CONFLICT (employee_id) DO NOTHING',
          [emp.employee_id, emp.name]
        );
        
        if (result.rowCount > 0) {
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`Inserted ${successCount} employees...`);
          }
        } else {
          skipCount++;
        }
      } catch (err) {
        console.error(`Error inserting ${emp.employee_id}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n=== Import Summary ===');
    console.log(`Successfully inserted: ${successCount}`);
    console.log(`Skipped (already exists): ${skipCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Total: ${employees.length}\n`);
    
    // Show total count in database
    const countResult = await pool.query('SELECT COUNT(*) as count FROM employee_data');
    console.log(`Total employees in database: ${countResult.rows[0].count}\n`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run import
importEmployees().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
