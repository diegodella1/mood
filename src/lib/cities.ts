// List of major cities for city selection
export const CITIES = [
  // Americas
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
  'Austin', 'Jacksonville', 'San Francisco', 'Seattle', 'Denver',
  'Washington DC', 'Boston', 'Nashville', 'Detroit', 'Portland',
  'Las Vegas', 'Miami', 'Atlanta', 'Minneapolis', 'Cleveland',
  'Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana',
  'Buenos Aires', 'Cordoba', 'Rosario', 'Mendoza', 'La Plata',
  'São Paulo', 'Rio de Janeiro', 'Brasilia', 'Salvador', 'Fortaleza',
  'Belo Horizonte', 'Curitiba', 'Manaus', 'Recife', 'Porto Alegre',
  'Bogota', 'Medellin', 'Cali', 'Barranquilla', 'Cartagena',
  'Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Cusco',
  'Santiago', 'Valparaiso', 'Concepcion', 'La Serena', 'Antofagasta',
  'Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay',
  'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa',

  // Europe
  'London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Edinburgh',
  'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Bordeaux',
  'Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Dusseldorf',
  'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Malaga', 'Bilbao',
  'Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence',
  'Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven',
  'Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liege',
  'Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck',
  'Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne',
  'Lisbon', 'Porto', 'Braga', 'Coimbra', 'Faro',
  'Warsaw', 'Krakow', 'Lodz', 'Wroclaw', 'Poznan', 'Gdansk',
  'Prague', 'Brno', 'Ostrava', 'Plzen',
  'Budapest', 'Debrecen', 'Szeged', 'Miskolc',
  'Bucharest', 'Cluj-Napoca', 'Timisoara', 'Iasi', 'Constanta',
  'Athens', 'Thessaloniki', 'Patras', 'Heraklion',
  'Stockholm', 'Gothenburg', 'Malmo', 'Uppsala',
  'Oslo', 'Bergen', 'Trondheim', 'Stavanger',
  'Copenhagen', 'Aarhus', 'Odense', 'Aalborg',
  'Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu',
  'Dublin', 'Cork', 'Limerick', 'Galway',
  'Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan',
  'Kyiv', 'Kharkiv', 'Odesa', 'Dnipro', 'Lviv',

  // Asia
  'Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto',
  'Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou', 'Wuhan',
  'Hong Kong', 'Macau',
  'Taipei', 'Kaohsiung', 'Taichung', 'Tainan',
  'Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon',
  'Singapore',
  'Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya',
  'Kuala Lumpur', 'George Town', 'Johor Bahru', 'Ipoh',
  'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Bali',
  'Manila', 'Quezon City', 'Davao', 'Cebu',
  'Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Hai Phong',
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune',
  'Karachi', 'Lahore', 'Islamabad', 'Faisalabad',
  'Dhaka', 'Chittagong', 'Khulna', 'Rajshahi',
  'Colombo', 'Kandy', 'Galle',
  'Kathmandu', 'Pokhara', 'Lalitpur',
  'Dubai', 'Abu Dhabi', 'Sharjah',
  'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam',
  'Tehran', 'Mashhad', 'Isfahan', 'Tabriz', 'Shiraz',
  'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya',
  'Tel Aviv', 'Jerusalem', 'Haifa', 'Rishon LeZion',

  // Africa
  'Cairo', 'Alexandria', 'Giza', 'Sharm El Sheikh',
  'Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt',
  'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth',
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru',
  'Addis Ababa', 'Dire Dawa', 'Mekelle',
  'Casablanca', 'Rabat', 'Fes', 'Marrakech', 'Tangier',
  'Algiers', 'Oran', 'Constantine',
  'Tunis', 'Sfax', 'Sousse',
  'Accra', 'Kumasi', 'Tamale',
  'Dakar', 'Thies', 'Saint-Louis',
  'Kinshasa', 'Lubumbashi', 'Mbuji-Mayi',
  'Luanda', 'Huambo', 'Lobito',
  'Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma',

  // Oceania
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide',
  'Gold Coast', 'Newcastle', 'Canberra', 'Hobart', 'Darwin',
  'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Dunedin',
].sort();

export const CITIES_BY_REGION: Record<string, string[]> = {
  'Americas': CITIES.filter(c => [
    'New York', 'Los Angeles', 'Chicago', 'Buenos Aires', 'São Paulo',
    'Mexico City', 'Toronto', 'Lima', 'Bogota', 'Santiago'
  ].includes(c)),
  'Europe': CITIES.filter(c => [
    'London', 'Paris', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Vienna'
  ].includes(c)),
  'Asia': CITIES.filter(c => [
    'Tokyo', 'Beijing', 'Shanghai', 'Seoul', 'Singapore', 'Bangkok', 'Mumbai'
  ].includes(c)),
  'Africa': CITIES.filter(c => [
    'Cairo', 'Lagos', 'Johannesburg', 'Nairobi', 'Casablanca'
  ].includes(c)),
  'Oceania': CITIES.filter(c => [
    'Sydney', 'Melbourne', 'Auckland', 'Brisbane', 'Perth'
  ].includes(c)),
};
