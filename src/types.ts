export interface User {
  email: string;
  garageName: string;
}

export interface Vehicle {
  id: string;
  name: string;
  mobile: string;
  vn: string;
  make: string;
  model: string;
  date: string;
  km: string;
  dr?: string;
  sdd: string;
  lob?: string;
  lb?: string;
}

export const MAKES: Record<string, string[]> = {
  Hero: ["Splendor Plus", "HF Deluxe", "Passion Pro", "Glamour", "Super Splendor", "Xtreme 160R", "Xtreme 125R", "Xpulse 200", "Xpulse 200 4V", "Mavrick 440", "Pleasure Plus"],
  Honda: ["Activa 3G", "Activa 4G", "Activa 5G", "Activa 6G", "Activa 125", "Activa 125 BS6", "Activa e:", "Dio", "Shine", "Shine 100", "SP 125", "SP 160", "Unicorn", "CB350", "CB350RS", "CB300R", "Hornet 2.0", "Livo", "Dream Yuga", "Grazia 125", "CBR650R", "X-Blade", "Navi"],
  Bajaj: ["Pulsar 125", "Pulsar 150", "Pulsar N150", "Pulsar 160NS", "Pulsar NS200", "Pulsar N250", "Pulsar RS200", "Dominar 250", "Dominar 400", "Avenger Street 160", "Avenger Cruise 220", "CT110", "Platina 110", "Chetak Electric"],
  TVS: ["Apache RTR 160", "Apache RTR 160 4V", "Apache RTR 200 4V", "Apache RR 310", "Jupiter 125", "Ntorq 125", "Raider 125", "iQube Electric", "XL100", "Star City+", "Ronin 225", "Sport"],
  "Royal Enfield": ["Classic 350", "Bullet 350", "Hunter 350", "Meteor 350", "Himalayan 450", "Scram 411", "Interceptor 650", "Continental GT 650", "Super Meteor 650", "Shotgun 650", "Guerrilla 450"],
  Yamaha: ["FZ-S V3", "FZ 25", "FZS 25", "MT-15 V2", "R15 V4", "R15M", "Fascino 125", "RayZR 125", "Aerox 155", "MT-03", "YZF-R3"],
  KTM: ["125 Duke", "200 Duke", "250 Duke", "390 Duke", "250 Adventure", "390 Adventure", "RC 390"],
  Suzuki: ["Access 125", "Burgman Street 125", "Gixxer", "Gixxer SF", "Gixxer SF 250", "Gixxer 250", "Avenis 125", "Hayabusa", "V-Strom SX"],
  "Ola Electric": ["S1 Pro", "S1 Air", "S1 X", "S1 X+"],
  Ather: ["450X", "450S", "Rizta"],
  Mahindra: ["Mojo 300", "Gusto 125", "XUV400 Electric"],
  Jawa: ["Jawa 42", "Jawa Classic", "Perak", "42 FJ", "Yezdi Roadster", "Yezdi Scrambler", "Yezdi Adventure"],
  Revolt: ["RV400", "RV400 BRZ", "RV1 Plus"],
  Tork: ["Kratos", "Kratos R"],
  Okinawa: ["Praise Pro", "Ridge+", "Okhi 90", "iPraise+"],
  Hero_Electric: ["Optima CX", "Photon", "Nyx HX", "Eddy"],
  Vida: ["V1 Pro", "V1 Plus"],
  "Bounce Infinity": ["E1", "E1 Plus"],
  Kabira: ["KM3000", "KM4000"],
  Ultraviolette: ["F77 Mach 2", "F77 Recon"],
  Pure_EV: ["EPluto 7G", "Etrance Neo", "ePlex"],
  Simple_Energy: ["Simple One"],
  Matter: ["Matter Aera"]
};

export const OILS = ["Castrol", "Shell", "Amron", "Motul", "Idemitsu", "Hero", "Honda", "Bajaj", "Eneos", "Servo"];
