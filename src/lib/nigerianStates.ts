export interface StateData {
  name: string;
  capital: string;
  lat: number;
  lng: number;
  lgas: string[];
}

export const NIGERIAN_STATES: StateData[] = [
  {
    name: 'Abia', capital: 'Umuahia', lat: 5.5320, lng: 7.4860,
    lgas: ['Aba North','Aba South','Arochukwu','Bende','Ikwuano','Isiala Ngwa North','Isiala Ngwa South','Isuikwuato','Obi Ngwa','Ohafia','Osisioma Ngwa','Ugwunagbo','Ukwa East','Ukwa West','Umuahia North','Umuahia South','Umu Nneochi']
  },
  {
    name: 'Adamawa', capital: 'Yola', lat: 9.3265, lng: 12.3984,
    lgas: ['Demsa','Fufore','Ganye','Gayuk','Gombi','Grie','Hong','Jada','Lamurde','Madagali','Maiha','Mayo-Belwa','Michika','Mubi North','Mubi South','Numan','Shelleng','Song','Toungo','Yola North','Yola South']
  },
  {
    name: 'Akwa Ibom', capital: 'Uyo', lat: 5.0377, lng: 7.9128,
    lgas: ['Abak','Eastern Obolo','Eket','Esit Eket','Essien Udim','Etim Ekpo','Etinan','Ibeno','Ibesikpo Asutan','Ibiono Ibom','Ika','Ikono','Ikot Abasi','Ikot Ekpene','Ini','Itu','Mbo','Mkpat Enin','Nsit Atai','Nsit Ibom','Nsit Ubium','Obot Akara','Okobo','Onna','Oron','Oruk Anam','Udung Uko','Ukanafun','Uruan','Urue-Offong/Oruko','Uyo']
  },
  {
    name: 'Anambra', capital: 'Awka', lat: 6.2209, lng: 6.9370,
    lgas: ['Aguata','Anambra East','Anambra West','Anaocha','Awka North','Awka South','Ayamelum','Dunukofia','Ekwusigo','Idemili North','Idemili South','Ihiala','Njikoka','Nnewi North','Nnewi South','Ogbaru','Onitsha North','Onitsha South','Orumba North','Orumba South','Oyi']
  },
  {
    name: 'Bauchi', capital: 'Bauchi', lat: 10.3103, lng: 9.8437,
    lgas: ['Alkaleri','Bauchi','Bogoro','Damban','Darazo','Dass','Gamawa','Ganjuwa','Giade','Itas/Gadau','Jama\'are','Katagum','Kirfi','Misau','Ningi','Shira','Tafawa Balewa','Toro','Warji','Zaki']
  },
  {
    name: 'Bayelsa', capital: 'Yenagoa', lat: 4.7719, lng: 6.0699,
    lgas: ['Brass','Ekeremor','Kolokuma/Opokuma','Nembe','Ogbia','Sagbama','Southern Ijaw','Yenagoa']
  },
  {
    name: 'Benue', capital: 'Makurdi', lat: 7.7337, lng: 8.5214,
    lgas: ['Ado','Agatu','Apa','Buruku','Gboko','Guma','Gwer East','Gwer West','Katsina-Ala','Konshisha','Kwande','Logo','Makurdi','Obi','Ogbadibo','Ohimini','Oju','Okpokwu','Otukpo','Tarka','Ukum','Ushongo','Vandeikya']
  },
  {
    name: 'Borno', capital: 'Maiduguri', lat: 11.8333, lng: 13.1500,
    lgas: ['Abadam','Askira/Uba','Bama','Bayo','Biu','Chibok','Damboa','Dikwa','Gubio','Guzamala','Gwoza','Hawul','Jere','Kaga','Kala/Balge','Konduga','Kukawa','Kwaya Kusar','Mafa','Magumeri','Maiduguri','Marte','Mobbar','Monguno','Ngala','Nganzai','Shani']
  },
  {
    name: 'Cross River', capital: 'Calabar', lat: 4.9517, lng: 8.3220,
    lgas: ['Abi','Akamkpa','Akpabuyo','Bakassi','Bekwarra','Biase','Boki','Calabar Municipal','Calabar South','Etung','Ikom','Obanliku','Obubra','Obudu','Odukpani','Ogoja','Yakurr','Yala']
  },
  {
    name: 'Delta', capital: 'Asaba', lat: 6.1981, lng: 6.7250,
    lgas: ['Aniocha North','Aniocha South','Bomadi','Burutu','Ethiope East','Ethiope West','Ika North East','Ika South','Isoko North','Isoko South','Ndokwa East','Ndokwa West','Okpe','Oshimili North','Oshimili South','Patani','Sapele','Udu','Ughelli North','Ughelli South','Ukwuani','Uvwie','Warri North','Warri South','Warri South West']
  },
  {
    name: 'Ebonyi', capital: 'Abakaliki', lat: 6.3249, lng: 8.1137,
    lgas: ['Abakaliki','Afikpo North','Afikpo South','Ebonyi','Ezza North','Ezza South','Ikwo','Ishielu','Ivo','Izzi','Ohaozara','Ohaukwu','Onicha']
  },
  {
    name: 'Edo', capital: 'Benin City', lat: 6.3350, lng: 5.6037,
    lgas: ['Akoko-Edo','Egor','Esan Central','Esan North-East','Esan South-East','Esan West','Etsako Central','Etsako East','Etsako West','Igueben','Ikpoba-Okha','Oredo','Orhionmwon','Ovia North-East','Ovia South-West','Owan East','Owan West','Uhunmwonde']
  },
  {
    name: 'Ekiti', capital: 'Ado-Ekiti', lat: 7.6211, lng: 5.2214,
    lgas: ['Ado-Ekiti','Efon','Ekiti East','Ekiti South-West','Ekiti West','Emure','Gbonyin','Ido-Osi','Ijero','Ikere','Ikole','Ilejemeje','Irepodun/Ifelodun','Ise/Orun','Moba','Oye']
  },
  {
    name: 'Enugu', capital: 'Enugu', lat: 6.4584, lng: 7.5464,
    lgas: ['Aninri','Awgu','Enugu East','Enugu North','Enugu South','Ezeagu','Igbo-Etiti','Igbo-Eze North','Igbo-Eze South','Isi-Uzo','Nkanu East','Nkanu West','Nsukka','Oji River','Udenu','Udi','Uzo-Uwani']
  },
  {
    name: 'FCT', capital: 'Abuja', lat: 9.0579, lng: 7.4951,
    lgas: ['Abaji','Bwari','Gwagwalada','Kuje','Kwali','Municipal Area Council']
  },
  {
    name: 'Gombe', capital: 'Gombe', lat: 10.2897, lng: 11.1711,
    lgas: ['Akko','Balanga','Billiri','Dukku','Funakaye','Gombe','Kaltungo','Kwami','Nafada','Shongom','Yamaltu/Deba']
  },
  {
    name: 'Imo', capital: 'Owerri', lat: 5.4836, lng: 7.0332,
    lgas: ['Aboh Mbaise','Ahiazu Mbaise','Ehime Mbano','Ezinihitte','Ideato North','Ideato South','Ihitte/Uboma','Ikeduru','Isiala Mbano','Isu','Mbaitoli','Ngor Okpala','Njaba','Nkwerre','Nwangele','Obowo','Oguta','Ohaji/Egbema','Okigwe','Onuimo','Orlu','Orsu','Oru East','Oru West','Owerri Municipal','Owerri North','Owerri West']
  },
  {
    name: 'Jigawa', capital: 'Dutse', lat: 11.7566, lng: 9.3399,
    lgas: ['Auyo','Babura','Biriniwa','Birnin Kudu','Buji','Dutse','Gagarawa','Garki','Gumel','Guri','Gwaram','Gwiwa','Hadejia','Jahun','Kafin Hausa','Kaugama','Kazaure','Kiri Kasama','Kiyawa','Maigatari','Malam Madori','Miga','Ringim','Roni','Sule Tankarkar','Taura','Yankwashi']
  },
  {
    name: 'Kaduna', capital: 'Kaduna', lat: 10.5105, lng: 7.4165,
    lgas: ['Birnin Gwari','Chikun','Giwa','Igabi','Ikara','Jaba','Jema\'a','Kachia','Kaduna North','Kaduna South','Kagarko','Kajuru','Kaura','Kauru','Kubau','Kudan','Lere','Makarfi','Sabon Gari','Sanga','Soba','Zangon Kataf','Zaria']
  },
  {
    name: 'Kano', capital: 'Kano', lat: 12.0022, lng: 8.5920,
    lgas: ['Ajingi','Albasu','Bagwai','Bebeji','Bichi','Bunkure','Dala','Dambatta','Dawakin Kudu','Dawakin Tofa','Doguwa','Fagge','Gabasawa','Garko','Garun Mallam','Gaya','Gezawa','Gwale','Gwarzo','Kabo','Kano Municipal','Karaye','Kibiya','Kiru','Kumbotso','Kunchi','Kura','Madobi','Makoda','Minjibir','Nassarawa','Rano','Rimin Gado','Rogo','Shanono','Sumaila','Takai','Tarauni','Tofa','Tsanyawa','Tudun Wada','Ungogo','Warawa','Wudil']
  },
  {
    name: 'Katsina', capital: 'Katsina', lat: 12.9816, lng: 7.6223,
    lgas: ['Bakori','Batagarawa','Batsari','Baure','Bindawa','Charanchi','Dan Musa','Dandume','Danja','Daura','Dutsi','Dutsin-Ma','Faskari','Funtua','Ingawa','Jibia','Kafur','Kaita','Kankara','Kankia','Katsina','Kurfi','Kusada','Mai\'Adua','Malumfashi','Mani','Mashi','Matazu','Musawa','Rimi','Sabuwa','Safana','Sandamu','Zango']
  },
  {
    name: 'Kebbi', capital: 'Birnin Kebbi', lat: 12.4539, lng: 4.1975,
    lgas: ['Aleiro','Arewa Dandi','Argungu','Augie','Bagudo','Birnin Kebbi','Bunza','Dandi','Fakai','Gwandu','Jega','Kalgo','Koko/Besse','Maiyama','Ngaski','Sakaba','Shanga','Suru','Wasagu/Danko','Yauri','Zuru']
  },
  {
    name: 'Kogi', capital: 'Lokoja', lat: 7.7969, lng: 6.7406,
    lgas: ['Adavi','Ajaokuta','Ankpa','Bassa','Dekina','Ibaji','Idah','Igalamela-Odolu','Ijumu','Kabba/Bunu','Koton Karfe','Lokoja','Mopa-Muro','Ofu','Ogori/Magongo','Okehi','Okene','Olamaboro','Omala','Yagba East','Yagba West']
  },
  {
    name: 'Kwara', capital: 'Ilorin', lat: 8.4966, lng: 4.5426,
    lgas: ['Asa','Baruten','Edu','Ekiti','Ifelodun','Ilorin East','Ilorin South','Ilorin West','Irepodun','Isin','Kaiama','Moro','Offa','Oke Ero','Oyun','Pategi']
  },
  {
    name: 'Lagos', capital: 'Ikeja', lat: 6.5244, lng: 3.3792,
    lgas: ['Agege','Ajeromi-Ifelodun','Alimosho','Amuwo-Odofin','Apapa','Badagry','Epe','Eti-Osa','Ibeju-Lekki','Ifako-Ijaiye','Ikeja','Ikorodu','Kosofe','Lagos Island','Lagos Mainland','Mushin','Ojo','Oshodi-Isolo','Shomolu','Surulere']
  },
  {
    name: 'Nassarawa', capital: 'Lafia', lat: 8.4966, lng: 8.5156,
    lgas: ['Akwanga','Awe','Doma','Karu','Keana','Keffi','Kokona','Lafia','Nassarawa','Nassarawa Eggon','Obi','Toto','Wamba']
  },
  {
    name: 'Niger', capital: 'Minna', lat: 9.6139, lng: 6.5569,
    lgas: ['Agaie','Agwara','Bida','Borgu','Bosso','Chanchaga','Edati','Gbako','Gurara','Katcha','Kontagora','Lapai','Lavun','Magama','Mariga','Mashegu','Mokwa','Munya','Paikoro','Rafi','Rijau','Shiroro','Suleja','Tafa','Wushishi']
  },
  {
    name: 'Ogun', capital: 'Abeokuta', lat: 7.1604, lng: 3.3500,
    lgas: ['Abeokuta North','Abeokuta South','Ado-Odo/Ota','Egbado North','Egbado South','Ewekoro','Ifo','Ijebu East','Ijebu North','Ijebu North East','Ijebu Ode','Ikenne','Imeko Afon','Ipokia','Obafemi Owode','Odeda','Odogbolu','Ogun Waterside','Remo North','Sagamu','Shagamu']
  },
  {
    name: 'Ondo', capital: 'Akure', lat: 7.2526, lng: 5.2103,
    lgas: ['Akoko North-East','Akoko North-West','Akoko South-East','Akoko South-West','Akure North','Akure South','Ese Odo','Idanre','Ifedore','Ilaje','Ile Oluji/Okeigbo','Irele','Odigbo','Okitipupa','Ondo East','Ondo West','Ose','Owo']
  },
  {
    name: 'Osun', capital: 'Osogbo', lat: 7.7707, lng: 4.5569,
    lgas: ['Aiyedaade','Aiyedire','Atakunmosa East','Atakunmosa West','Boluwaduro','Boripe','Ede North','Ede South','Egbedore','Ejigbo','Ife Central','Ife East','Ife North','Ife South','Ifedayo','Ifelodun','Ila','Ilesa East','Ilesa West','Irepodun','Irewole','Isokan','Iwo','Obokun','Odo Otin','Ola Oluwa','Olorunda','Oriade','Orolu','Osogbo']
  },
  {
    name: 'Oyo', capital: 'Ibadan', lat: 7.3775, lng: 3.9470,
    lgas: ['Afijio','Akinyele','Atiba','Atisbo','Egbeda','Ibadan North','Ibadan North-East','Ibadan North-West','Ibadan South-East','Ibadan South-West','Ibarapa Central','Ibarapa East','Ibarapa North','Ido','Irepo','Iseyin','Itesiwaju','Iwajowa','Kajola','Lagelu','Ogbomoso North','Ogbomoso South','Ogo Oluwa','Oluyole','Ona Ara','Orelope','Ori Ire','Oyo East','Oyo West','Saki East','Saki West','Surulere']
  },
  {
    name: 'Plateau', capital: 'Jos', lat: 9.8965, lng: 8.8583,
    lgas: ['Barkin Ladi','Bassa','Bokkos','Jos East','Jos North','Jos South','Kanam','Kanke','Langtang North','Langtang South','Mangu','Mikang','Pankshin','Qua\'an Pan','Riyom','Shendam','Wase']
  },
  {
    name: 'Rivers', capital: 'Port Harcourt', lat: 4.8156, lng: 7.0498,
    lgas: ['Abua/Odual','Ahoada East','Ahoada West','Akuku-Toru','Andoni','Asari-Toru','Bonny','Degema','Eleme','Emohua','Etche','Gokana','Ikwerre','Khana','Obio/Akpor','Ogba/Egbema/Ndoni','Ogu/Bolo','Okrika','Omuma','Opobo/Nkoro','Oyigbo','Port Harcourt','Tai']
  },
  {
    name: 'Sokoto', capital: 'Sokoto', lat: 13.0059, lng: 5.2476,
    lgas: ['Binji','Bodinga','Dange Shuni','Gada','Goronyo','Gudu','Gwadabawa','Illela','Isa','Kebbe','Kware','Rabah','Sabon Birni','Shagari','Silame','Sokoto North','Sokoto South','Tambuwal','Tangaza','Tureta','Wamako','Wurno','Yabo']
  },
  {
    name: 'Taraba', capital: 'Jalingo', lat: 8.8937, lng: 11.3596,
    lgas: ['Ardo Kola','Bali','Donga','Gashaka','Gassol','Ibi','Jalingo','Karim Lamido','Kurmi','Lau','Sardauna','Takum','Ussa','Wukari','Yorro','Zing']
  },
  {
    name: 'Yobe', capital: 'Damaturu', lat: 11.7468, lng: 11.9662,
    lgas: ['Bade','Bursari','Damaturu','Fika','Fune','Geidam','Gujba','Gulani','Jakusko','Karasuwa','Machina','Nangere','Nguru','Potiskum','Tarmuwa','Yunusari','Yusufari']
  },
  {
    name: 'Zamfara', capital: 'Gusau', lat: 12.1628, lng: 6.6642,
    lgas: ['Anka','Bakura','Birnin Magaji/Kiyaw','Bukkuyum','Bungudu','Gummi','Gusau','Kaura Namoda','Maradun','Maru','Shinkafi','Talata Mafara','Tsafe','Zurmi']
  },
];

// Get state by name
export function getStateByName(name: string): StateData | undefined {
  return NIGERIAN_STATES.find(s => s.name === name);
}
