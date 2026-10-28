import { MigrationInterface, QueryRunner } from 'typeorm';

// Initial help content, previously hard-coded in orion_frontend/src/pages/SupportPages.tsx.
const DEFAULT_AIDE: Array<{ titre: string; description: string; questions: Array<{ titre: string; description: string }> }> = [
  {
    "titre": "Compte et connexion",
    "description": "Créer un compte, se connecter, modifier son profil",
    "questions": [
      {
        "titre": "Comment créer un compte sur Orion ?",
        "description": "Clique sur « Créer mon compte » depuis la page de connexion, renseigne ton e-mail et un mot de passe, puis choisis ton profil : Commerçant ou Jeune entrepreneur. Tu peux ensuite compléter ton profil à tout moment."
      },
      {
        "titre": "Puis-je changer de profil après l’inscription ?",
        "description": "Non. Le profil Commerçant ou Jeune entrepreneur est choisi à l’inscription et reste définitif. Si tu as besoin d’un autre profil, contacte le support."
      },
      {
        "titre": "J’ai oublié mon mot de passe. Que faire ?",
        "description": "Écris au support à orionmarket9@gmail.com depuis l’adresse e-mail de ton compte : l’équipe t’aidera à retrouver l’accès."
      },
      {
        "titre": "Comment modifier mes informations personnelles ?",
        "description": "Depuis ton tableau de bord, ouvre « Profil » pour mettre à jour ton nom, tes coordonnées et ta photo."
      }
    ]
  },
  {
    "titre": "Acheter un produit",
    "description": "Commander, payer, recevoir sa commande",
    "questions": [
      {
        "titre": "Comment passer une commande ?",
        "description": "Ajoute les produits à ton panier depuis la marketplace, puis ouvre le panier et clique sur « Payer ». Tu dois être connecté pour finaliser la commande."
      },
      {
        "titre": "Comment indiquer mon adresse de livraison ?",
        "description": "Au moment du paiement, colle un lien Google Maps de ton adresse ou utilise le bouton de position pour partager ta position actuelle."
      },
      {
        "titre": "Quels modes de paiement sont acceptés ?",
        "description": "Le paiement se fait sur la page sécurisée de FedaPay, avec les moyens qu’elle propose (Mobile Money notamment). Orion ne collecte aucune donnée bancaire."
      },
      {
        "titre": "Quand ma commande est-elle confirmée ?",
        "description": "Dès que FedaPay confirme le paiement, la commande passe au statut payé et apparaît dans « Mes commandes ». Tu n’as aucune référence à saisir."
      },
      {
        "titre": "Comment confirmer la réception de ma commande ?",
        "description": "À la remise, le vendeur te montre un QR code. Scanne-le depuis « Mes commandes » (ou importe une photo du QR) : cela confirme la réception et libère le paiement au vendeur. Ne scanne le QR qu’une fois la commande reçue."
      }
    ]
  },
  {
    "titre": "Vendre sur Orion",
    "description": "Boutique, produits, commandes reçues",
    "questions": [
      {
        "titre": "Comment devenir commerçant ?",
        "description": "Choisis le profil Commerçant lors de ton inscription, puis crée ta boutique depuis ton tableau de bord."
      },
      {
        "titre": "Combien coûte l’ouverture d’une boutique ?",
        "description": "L’offre Standard est gratuite : elle comprend une boutique et jusqu’à 40 produits."
      },
      {
        "titre": "Comment publier un produit ?",
        "description": "Dans ton tableau de bord, ouvre « Mes produits » et ajoute un produit : nom, prix, catégorie, stock, description et photos. Tu peux aussi définir un prix promotionnel."
      },
      {
        "titre": "Quand suis-je payé ?",
        "description": "Le montant d’une commande payée est bloqué jusqu’à la remise. Génère le QR de remise depuis tes commandes reçues et fais-le scanner par le client : le montant est alors libéré dans ton portefeuille Orion."
      }
    ]
  },
  {
    "titre": "Opportunités",
    "description": "Postuler, publier une mission",
    "questions": [
      {
        "titre": "Que sont les opportunités ?",
        "description": "Ce sont des missions publiées par des commerçants : emploi, collaboration, prestation. Les jeunes entrepreneurs peuvent y postuler directement."
      },
      {
        "titre": "Comment postuler à une opportunité ?",
        "description": "Ouvre l’offre et envoie ta candidature. Tu suis sa réponse (en attente, acceptée ou refusée) dans « Mes candidatures »."
      },
      {
        "titre": "Combien coûte la publication d’une mission ?",
        "description": "La publication coûte 500 FCFA, payés via FedaPay. La mission devient visible dès que le paiement est confirmé."
      }
    ]
  },
  {
    "titre": "Sécurité et litiges",
    "description": "Arnaques, problème avec un vendeur",
    "questions": [
      {
        "titre": "Comment éviter les arnaques ?",
        "description": "Paie toujours dans Orion, jamais en dehors de la plateforme. Ne scanne le QR de remise qu’après avoir reçu ta commande et ne partage jamais ton code secret Mobile Money."
      },
      {
        "titre": "J’ai un problème avec un vendeur. Que faire ?",
        "description": "Contacte d’abord le vendeur par la messagerie. Si le problème persiste, écris à orionmarket9@gmail.com avec ta référence de commande et des captures d’écran."
      },
      {
        "titre": "Comment signaler un produit ou un compte suspect ?",
        "description": "Écris à orionmarket9@gmail.com en indiquant le lien du produit ou de la boutique concernée. L’équipe examine chaque signalement."
      }
    ]
  }
];

export class CreateAide20261028000000 implements MigrationInterface {
  name = 'CreateAide20261028000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "aide_categorie" ("id" SERIAL NOT NULL, "titre" character varying(150) NOT NULL, "description" character varying(500) NOT NULL DEFAULT '', CONSTRAINT "PK_aide_categorie_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "aide_question" ("id" SERIAL NOT NULL, "categorieId" integer NOT NULL, "titre" character varying(255) NOT NULL, "description" text NOT NULL, CONSTRAINT "PK_aide_question_id" PRIMARY KEY ("id"), CONSTRAINT "FK_aide_question_categorie" FOREIGN KEY ("categorieId") REFERENCES "aide_categorie"("id") ON DELETE CASCADE)`);
    const [{ count }] = await queryRunner.query(`SELECT COUNT(*)::int AS count FROM "aide_categorie"`);
    if (count > 0) return;
    for (const categorie of DEFAULT_AIDE) {
      const [{ id }] = await queryRunner.query(`INSERT INTO "aide_categorie" ("titre", "description") VALUES ($1, $2) RETURNING "id"`, [categorie.titre, categorie.description]);
      for (const question of categorie.questions) {
        await queryRunner.query(`INSERT INTO "aide_question" ("categorieId", "titre", "description") VALUES ($1, $2, $3)`, [id, question.titre, question.description]);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "aide_question"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "aide_categorie"`);
  }
}
