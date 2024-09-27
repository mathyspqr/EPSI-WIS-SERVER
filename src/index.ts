import cors from "cors";
import express from "express";
const nodemailer = require("nodemailer");

var mysql = require("mysql");
var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "epsiwis",
});

connection.connect(function (err: { stack: string }) {
  if (err) {
    console.error("error connecting: " + err.stack);
    return;
  }
  console.log("connected as id " + connection.threadId);
});

const query = async (query: string, params?: any[]): Promise<any> =>
  new Promise((resolve, reject) => {
    connection.query(
      query,
      params,
      (error: any, results: unknown, fields: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      }
    );
  });

// on créé une instance d'une application Express
const app = express();

// on précise à l'application qu'elle doit parser le body des requêtes en JSON (utilisation d'un middleware)
app.use(express.json());

const bcrypt = require("bcrypt");
// on peut utiliser app.get, app.post, app.put, app.delete, etc.. ()

// ROUTE POUR RECUP LES USER
app.get(
  "/nurscare",
  async (request: express.Request, result: express.Response) => {
    let todos = await query("Select * from user");
    console.log(`route "/nurscare" called`);
    return result.status(200).json(todos);
  }
);

app.get(
  "/nurscare/administratifuser",
  async (request: express.Request, result: express.Response) => {
    let todos = await query("Select * from administratif");
    console.log(`route "/nurscare" called`);
    return result.status(200).json(todos);
  }
);

app.get(
  "/nurscare/bdeinfo",
  async (request: express.Request, result: express.Response) => {
    try {
      const todos = await query(`
        SELECT bde.*, campus.* 
        FROM bde 
        INNER JOIN campus ON bde.id_campus = campus.id_campus
      `);
      console.log(`route "/nurscare/bdeinfo" called`);
      return result.status(200).json(todos);
    } catch (error) {
      console.error("Error fetching BDE information:", error);
      return result.status(500).json("Internal Server Error");
    }
  }
);


app.get(
  "/nurscare/roles",
  async (request: express.Request, result: express.Response) => {
    try {
      const queryResult = await query(`
        SELECT administratif.*, 
               campus.nom_campus, 
               campus.adresse_campus, 
               role.nom_role 
        FROM administratif
        LEFT JOIN campus ON administratif.id_campus = campus.id_campus
        LEFT JOIN role ON administratif.id_role = role.id_role
        WHERE administratif.id_role IN (2, 3, 4)
      `);
      console.log(`Route "/nurscare/roles" appelée`);

      if (queryResult.length === 0) {
        return result.status(404).send("Aucun utilisateur trouvé avec ces rôles");
      }

      return result.status(200).json(queryResult);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
      return result.status(500).send("Erreur interne du serveur");
    }
  }
);


//ROUTE POUR RECUPERER LES STAGIARES
app.get("/nurscare/stagiaire", async (request, response) => {
  try {
    let queryResult = await query(
      "SELECT s.*, " +
      "p.nom_personnel, p.prenom_personnel, p.email_personnel, p.id_role, p.mdp_personnel, " +
      "p.date_naissance_personnel, p.adresse_personnel, " +
      "o.nom_organisme, o.adresse_organisme " +
      "FROM stagiaire s " +
      "JOIN personnel p ON s.id_personnel = p.id_personnel " +
      "JOIN organisme o ON s.id_organisme = o.id_organisme"
    );

    console.log("Route '/nurscare/stagiaires' called");
    
    return response.status(200).json(queryResult);
  } catch (error) {
    console.error("Error:", error);
    return response.status(500).json("Internal Server Error");
  }
});

//ROUTE POUR RECUPERER LES STAGIARES
app.get("/nurscare/stagiaire2mois", async (request, response) => {
  try {
    let queryResult = await query(
      "SELECT s.intitule_stage, " + 
      "p.nom_personnel, p.prenom_personnel, p.email_personnel, p.id_role, p.mdp_personnel, " +
      "p.date_naissance_personnel, p.adresse_personnel, " +
      "o.nom_organisme, o.adresse_organisme " +
      "FROM stagiaire s " +
      "JOIN personnel p ON s.id_personnel = p.id_personnel " +
      "JOIN organisme o ON s.id_organisme = o.id_organisme " +
      "WHERE s.duree_stage > 2"
    );

    console.log("Route '/nurscare/stagiaire2mois' called");

    return response.status(200).json(queryResult);
  } catch (error) {
    console.error("Error:", error);
    return response.status(500).json("Internal Server Error");
  }
});

//ORGA STAGIAIRE
app.get("/nurscare/stagiaireorga", async (request, response) => {
  try {
    let queryResult = await query(
      "SELECT o.nom_organisme, o.adresse_organisme, " +
      "(SELECT COUNT(*) FROM stagiaire s2 WHERE s2.id_organisme = o.id_organisme) AS nb_stagiaires " +
      "FROM organisme o"
    );

    console.log("Route '/nurscare/stagiaire' called");

    return response.status(200).json(queryResult);
  } catch (error) {
    console.error("Error:", error);
    return response.status(500).json("Internal Server Error");
  }
});


//ROUTE POUR RECUPERER LES BONS
app.get("/nurscare/bons", async (request, response) => {
  try {
    let queryResult = await query("SELECT * FROM bons");

    console.log("Route '/nurscare/bons' called");

    return response.status(200).json(queryResult);
  } catch (error) {
    console.error("Error:", error);
    return response.status(500).json("Internal Server Error");
  }
});

// ROUTE POUR AJOUTER UN BON
app.post("/nurscare/bon", async (request, response) => {
  const { note_prestation, commentaire_prestation, id_personnel, id_stagiaire, id_prestation, id_intervention } = request.body;

  try {
    await query("START TRANSACTION");

    const insertIntervenirQuery = await query(
      "INSERT INTO intervenir (id_personnel, id_prestation, id_intervention) VALUES (?, ?, ?)",
      [id_stagiaire, id_prestation, id_intervention]
    );

    const insertBonQuery = await query(
      "INSERT INTO bons (note_prestation, commentaire_prestation, id_personnel, id_stagiaire, id_prestation, id_intervention) VALUES (?, ?, ?, ?, ?, ?)",
      [note_prestation, commentaire_prestation, id_personnel, id_stagiaire, id_prestation, id_intervention]
    );

    await query("COMMIT");

    console.log("Nouveau bon ajouté:", insertBonQuery);

    return response.status(201).json("Bon ajouté avec succès");
  } catch (error) {
    console.error("Error:", error);
    return response.status(500).json("Internal Server Error");
  }
});

// ROUTE POUR RÉCUPÉRER LES MESSAGES D'UN UTILISATEUR
app.get('/nurscare/messages/received/:userId', async (request, response) => {
  const userId = request.params.userId;
  try {
    const queryResult = await query("SELECT * FROM messages WHERE id_destinataire = ?", [userId]);
    return response.status(200).json(queryResult);
  } catch (error) {
    console.error("Error:", error);
    return response.status(500).json("Internal Server Error");
  }
});

// ROUTE POUR ENVOYER UN MESSAGE
app.post('/nurscare/messages/send', async (request, response) => {
  const { id_expéditeur, id_destinataire, sujet, contenu, id_message_parent } = request.body; // Ajout de id_message_parent
  try {
    const insertMessageQuery = await query(
      "INSERT INTO messages (id_expéditeur, id_destinataire, sujet, contenu, id_message_parent) VALUES (?, ?, ?, ?, ?)", // Ajout de id_message_parent dans la requête
      [id_expéditeur, id_destinataire, sujet, contenu, id_message_parent]
    );
    return response.status(201).json("Message envoyé avec succès");
  } catch (error) {
    console.error("Error:", error);
    return response.status(500).json("Internal Server Error");
  }
});

app.get('/nurscare/messages/conversation/:idMessage', async (request, response) => {
  const idMessage = request.params.idMessage;
  try {
    // Récupérer le message parent
    const parentMessageQuery = await query("SELECT id_message_parent FROM messages WHERE id_message = ?", [idMessage]);
    const idMessageParent = parentMessageQuery[0]?.id_message_parent || idMessage; // Si pas de parent, utiliser l'id du message actuel

    // Récupérer tous les messages de la conversation avec les détails des utilisateurs
    const queryResult = await query(`
      SELECT m.*, 
             u_exp.nom_user AS nom_expediteur, 
             u_exp.prenom_user AS prenom_expediteur, 
             u_dest.nom_user AS nom_destinataire, 
             u_dest.prenom_user AS prenom_destinataire 
      FROM messages m
      LEFT JOIN user u_exp ON m.id_expéditeur = u_exp.id_user
      LEFT JOIN user u_dest ON m.id_destinataire = u_dest.id_user
      WHERE m.id_message_parent = ? OR m.id_message = ?`, 
      [idMessageParent, idMessage]
    );

    return response.status(200).json(queryResult);
  } catch (error) {
    console.error("Error:", error);
    return response.status(500).json("Internal Server Error");
  }
});


// ROUTE POUR ENVOYER UNE RÉPONSE À UN MESSAGE
app.post('/nurscare/messages/reply', async (request, response) => {
  const { id_expéditeur, id_destinataire, sujet, contenu, id_messageparent } = request.body;
  try {
    const insertReplyQuery = await query(
      "INSERT INTO messages (id_expéditeur, id_destinataire, sujet, contenu, id_messageparent) VALUES (?, ?, ?, ?, ?)",
      [id_expéditeur, id_destinataire, sujet, contenu, id_messageparent]
    );
    return response.status(201).json("Réponse envoyée avec succès");
  } catch (error) {
    console.error("Error:", error);
    return response.status(500).json("Internal Server Error");
  }
});

app.get('/nurscare/messages/received/:userId/with-responses', async (request, response) => {
  const userId = request.params.userId;
  try {
    const queryResult = await query(`
      SELECT 
        m.*, 
        u.nom_user AS destinataire_nom, 
        u.prenom_user AS destinataire_prenom, 
        u.id_campus AS destinataire_id_campus,
        ue.nom_user AS expediteur_nom, 
        ue.prenom_user AS expediteur_prenom,
        ue.id_campus AS expediteur_id_campus
      FROM messages m
      LEFT JOIN user u ON m.id_destinataire = u.id_user
      LEFT JOIN user ue ON m.id_expéditeur = ue.id_user
      WHERE 
        m.id_destinataire = ? 
        OR m.id_message IN (SELECT id_message_parent FROM messages WHERE id_destinataire = ?)
        OR m.id_expéditeur = ?
    `, [userId, userId, userId]);
    
    return response.status(200).json(queryResult);
  } catch (error) {
    console.error("Error:", error);
    return response.status(500).json("Internal Server Error");
  }
});



// ROUTE POUR RECUPERER LES INTERVENTIONS
app.get(
  "/nurscare/agendasinterventions",
  async (request: express.Request, result: express.Response) => {
    try {
      let agendasInterventions = await query(`
        SELECT *
        FROM intervention
      `);

      console.log(`Route "/nurscare/agendasprevisionnels" called`);
      return result.status(200).json({
        message: "Agendas prévisionnels récupérés avec succès",
        agendasInterventions,
      });
    } catch (error) {
      console.error("Error in /nurscare/agendasprevisionnels:", error);
      return result.status(500).json({ message: "Internal server error" });
    }
  }
);

// ROUTE POUR RECUPERER UNE INTERVENTION PAR ID
app.get(
  "/nurscare/intervention/:id",
  async (request: express.Request, result: express.Response) => {
    const { id } = request.params;
    try {
      const intervention = await query(`
        SELECT *
        FROM attribuer
        WHERE id_intervention = ?
      `, [id]);

      if (intervention.length === 0) {
        return result.status(404).json({ message: "Intervention not found" });
      }
      console.log(`Route "/nurscare/intervention/${id}" called`);
      return result.status(200).json({
        message: "Intervention récupérée avec succès",
        intervention: intervention[0],
      });
    } catch (error) {
      console.error(`Error in /nurscare/intervention/${id}:`, error);
      return result.status(500).json({ message: "Internal server error" });
    }
  }
);


// ROUTE POUR RECUPERER LES INTERVENTIONS D'UN SOIGNANT
app.get(
  "/nurscare/agendasinterventions/:id_personnel",
  async (request: express.Request, result: express.Response) => {
    try {
      const id_personnel = request.params.id_personnel;

      let agendasInterventions = await query(
        `
        SELECT i.*
        FROM intervention i
        JOIN attribuer a ON i.id_intervention = a.id_intervention
        WHERE a.id_personnel = ?
      `,
        [id_personnel]
      );

      console.log(`Route "/nurscare/agendasinterventions" called`);
      return result.status(200).json({
        message: "Agendas interventions récupérés avec succès",
        agendasInterventions,
      });
    } catch (error) {
      console.error("Error in /nurscare/agendasinterventions:", error);
      return result.status(500).json({ message: "Internal server error" });
    }
  }
);


app.get(
  "/nurscare/agendasprestations",
  async (request: express.Request, response: express.Response) => {
    try {
      let agendasPrestations = await query(`
        SELECT DISTINCT
          prestation_de_soin.*, 
          intervention.*, 
          patient.*, 
          personnel.*,
          categorie.* 
        FROM 
          intervention
          JOIN contenir ON intervention.id_intervention = contenir.id_intervention
          JOIN prestation_de_soin ON contenir.id_prestation = prestation_de_soin.id_prestation
          JOIN patient ON intervention.id_patient = patient.id_patient
          JOIN realiser ON intervention.id_intervention = realiser.id_intervention
          JOIN personnel ON realiser.id_personnel = personnel.id_personnel
          JOIN categorie ON prestation_de_soin.id_categorie = categorie.id_categorie
      `);

      console.log(`Route "/nurscare/agendasprestations" called`);
      return response.status(200).json({
        message: "Agendas prestations récupérés avec succès",
        agendasPrestations,
      });
    } catch (error) {
      console.error("Error in /nurscare/agendasprestations:", error);
      return response.status(500).json({ message: "Internal server error" });
    }
  }
);

app.get(
  "/nurscare/agendasprestationsall",
  async (request: express.Request, result: express.Response) => {
    try {
      let agendasPrestations = await query(`
      SELECT * from prestation_de_soin
      `);
      console.log(`Route "/nurscare/agendasprevisionnels" called`);
      return result.status(200).json({
        message: "Agendas prévisionnels récupérés avec succès",
        agendasPrestations,
      });
    } catch (error) {
      console.error("Error in /nurscare/agendasprevisionnels:", error);
      return result.status(500).json({ message: "Internal server error" });
    }
  }
);

//ROUTE POUR RECUP LES BONS ALL
app.get(
  "/nurscare/bonsall",
  async (request: express.Request, response: express.Response) => {
    try {
      let bons = await query(`
        SELECT DISTINCT
          bons.id_bon, 
          bons.note_prestation, 
          bons.commentaire_prestation,
          bons.id_personnel,
          bons.id_stagiaire,
          bons.id_prestation,
          bons.id_intervention,
          personnel_infirmier.nom_personnel AS nom_infirmier, 
          personnel_infirmier.prenom_personnel AS prenom_infirmier,
          personnel_infirmier.email_personnel AS email_infirmier, 
          personnel_infirmier.id_role AS role_infirmier,
          personnel_infirmier.date_naissance_personnel AS date_naissance_infirmier, 
          personnel_infirmier.adresse_personnel AS adresse_infirmier,
          stagiaire.nom_personnel AS nom_stagiaire, 
          stagiaire.prenom_personnel AS prenom_stagiaire,
          intervention.*,
          prestation_de_soin.*
          FROM bons
          LEFT JOIN personnel AS personnel_infirmier ON bons.id_personnel = personnel_infirmier.id_personnel
          LEFT JOIN personnel AS stagiaire ON bons.id_stagiaire = stagiaire.id_personnel
          LEFT JOIN intervention ON bons.id_intervention = intervention.id_intervention
          LEFT JOIN prestation_de_soin ON bons.id_prestation = prestation_de_soin.id_prestation
      `);
      console.log(`Route "/nurscare/bonsall" called`);
      return response.status(200).json({
        message: "Bons récupérés avec succès",
        bons,
      });
    } catch (error) {
      console.error("Error in /nurscare/bonsall:", error);
      return response.status(500).json({ message: "Internal server error" });
    }
  }
);

// ROUTE POUR RECUP UN USER ET LES INFOS
app.get("/nurscare/:id_personnel", async (request, response) => {
  const idPersonnel = request.params.id_personnel;
  if (!/^\d+$/.test(idPersonnel)) {
    return response.status(400).send("Invalid ID");
  }
  try {
    let queryResult = await query(
      `SELECT user.*, campus.nom_campus, campus.adresse_campus 
       FROM user 
       LEFT JOIN campus ON user.id_campus = campus.id_campus 
       WHERE user.id_user = ?`,
      [idPersonnel]
    );

    if (queryResult.length === 0) {
      return response.status(404).send("Personnel not found");
    }
    console.log(`Route "/nurscare/${idPersonnel}" called`);
    return response.status(200).json(queryResult[0]);
  } catch (error) {
    console.error("Error:", error);
    return response.status(500).send("Internal Server Error");
  }
});

// ROUTE POUR CREER UN USER
app.post("/nurscare/createaccount", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await query(
      `INSERT INTO user (email_user , mdp_user) VALUES ('${email}', '${hashedPassword}')`
    );
    console.log(`Nouveau compte creer pour ${email}`);
    res.status(201).json({ message: "Account created successfully" });
  } catch (error) {
    console.error("Error in /createaccount:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ROUTE POUR CREER UN PATIENT
app.post("/nurscare/createpatient", async (req, res) => {
  try {
    const {
      nom_patient,
      prenom_patient,
      email_patient,
      adresse_patient,
      datenaissance_patient,
    } = req.body;

    if (
      !nom_patient ||
      !prenom_patient ||
      !email_patient ||
      !adresse_patient ||
      !datenaissance_patient
    ) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    await query(
      `INSERT INTO patient (nom_patient, prenom_patient, email_patient, adresse_patient, datenaissance_patient) VALUES (?, ?, ?, ?, ?)`,
      [
        nom_patient,
        prenom_patient,
        email_patient,
        adresse_patient,
        datenaissance_patient,
      ]
    );
    console.log(`Nouveau patient créé : ${nom_patient} ${prenom_patient}`);
    res.status(201).json({ message: "Patient créé avec succès" });
  } catch (error) {
    console.error("Erreur dans /nurscare/createpatient:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// ROUTE POUR DELETE UN PATIENT
app.delete("/nurscare/deletepatient/:patientId", async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ message: "L'ID du patient est requis" });
    }
    const result = await query(`DELETE FROM patient WHERE id_patient = ?`, [
      patientId,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Patient non trouvé" });
    }
    console.log(`Patient supprimé : ID ${patientId}`);
    res.status(200).json({ message: "Patient supprimé avec succès" });
  } catch (error) {
    console.error("Erreur dans /nurscare/deletepatient:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// ROUTE POUR MODIFIER UN PATIENT
app.put("/nurscare/updatepatient/:patientId", async (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      nom_patient,
      prenom_patient,
      email_patient,
      adresse_patient,
      datenaissance_patient,
    } = req.body;
    if (
      !nom_patient ||
      !prenom_patient ||
      !email_patient ||
      !adresse_patient ||
      !datenaissance_patient
    ) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }
    const result = await query(
      `UPDATE patient SET nom_patient = ?, prenom_patient = ?, email_patient = ?, adresse_patient = ?, datenaissance_patient = ? WHERE id_patient = ?`,
      [
        nom_patient,
        prenom_patient,
        email_patient,
        adresse_patient,
        datenaissance_patient,
        patientId,
      ]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Patient non trouvé" });
    }
    console.log(
      `Patient mis à jour : ID ${patientId} avec comme mise à jour ${nom_patient}, ${prenom_patient}, ${email_patient}, ${adresse_patient}, ${datenaissance_patient}`
    );
    res.status(200).json({ message: "Patient mis à jour avec succès" });
  } catch (error) {
    console.error("Erreur dans /nurscare/updatepatient:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

//MODIF STAGIAIRE
app.put('/nurscare/updatestagiaire/:id_personnel', async (req, res) => {
  try {
    const { id_personnel } = req.params;
    const {
      id_organisme,
      intitule_stage,
      duree_stage,
      date_debut_stage
    } = req.body;

    const result = await query(
      `UPDATE stagiaire SET id_organisme = ?, intitule_stage = ?, duree_stage = ?, date_debut_stage = ? WHERE id_personnel = ?`,
      [
        id_organisme,
        intitule_stage,
        duree_stage,
        date_debut_stage,
        id_personnel
      ]
    );
    if (result.affectedRows > 0) {
      res.status(200).json({ message: `Stagiaire avec l'id_personnel ${id_personnel} mis à jour avec succès.` });
    } else {
      res.status(404).json({ message: `Stagiaire avec l'id_personnel ${id_personnel} non trouvé.` });
    }
  } catch (error) {
    console.error("Erreur dans /nurscare/updatestagiaire:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// ROUTE POUR LOGIN UN USER
app.post("/nurscare/loginaccount", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const users = await query(
      "SELECT * FROM user WHERE email_user = ?",
      [email]
    );
    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const user = users[0];
    const isValid = await bcrypt.compare(password, user.mdp_user);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    res.status(200).json({
      message: "Login successful",
      user: {
        id_user: user.id_user,
        email_user: user.email_user,
        nom_user: user.nom_user,
        prenom_user: user.prenom_user,
        adresse_user: user.adresse_user,
        role_personnel: user.id_role,
        id_campus: user.id_campus
      },
    });
  } catch (error) {
    console.error("Error in /loginaccount:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ROUTE POUR MODIFIER UN UTILISATEUR
app.post("/nurscare/submitform", async (req, res) => {
  try {
    const {
      Email,
      nom_user,
      prenom_user,
      adresse_user,
      id_campus,
      id_user, // On récupère l'ID de l'utilisateur à modifier
    } = req.body;
    console.log("Données du formulaire reçues:", req.body);

    let updateParts = [];
    let values = [];

    if (Email) {
      updateParts.push("email_user = ?");
      values.push(Email);
    }

    if (nom_user) {
      updateParts.push("nom_user = ?");
      values.push(nom_user);
    }
    
    if (prenom_user) {
      updateParts.push("prenom_user = ?");
      values.push(prenom_user);
    }
    
    if (adresse_user) {
      updateParts.push("adresse_user = ?");
      values.push(adresse_user);
    }

    if (id_campus) {
      updateParts.push("id_campus = ?");
      values.push(id_campus);
    }

    if (updateParts.length === 0 || !id_user) {
      return res.status(400).json({ message: "Aucun champ à mettre à jour ou ID manquant" });
    }

    const updateQuery = `UPDATE user SET ${updateParts.join(", ")} WHERE id_user = ?`;
    values.push(id_user);

    const result = await query(updateQuery, values);
    console.log("Résultat de la mise à jour:", result);

    if (result.affectedRows === 0) {
      console.log(`Aucun enregistrement trouvé avec id_user = ${id_user}`);
      return res.status(404).json({ message: "Enregistrement non trouvé" });
    }

    console.log(`Données du formulaire mises à jour pour ${Email}`);
    res.status(200).json({ message: "Données du formulaire mises à jour avec succès" });
  } catch (error) {
    console.error("Erreur dans /submitform:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});


// ROUTE POUR ADD UNE INTERVENTION
app.post("/nurscare/addintervention", async (req, res) => {
  try {
    const formData = req.body;

    // 1. Insérer l'intervention
    const resultIntervention = await query(
      `
      INSERT INTO intervention (libelle_intervention, date_intervention_debut, date_intervention_fin, id_patient, etat_intervention)
      VALUES (?, ?, ?, ?, ?)
    `,
      [formData.text, formData.startDate, formData.endDate, formData.id_patient, 'en cours']
    );

    const idIntervention = resultIntervention.insertId;

    // 2. Insérer l'attribution
    const resultAttribution = await query(
      `
      INSERT INTO attribuer (id_intervention, id_personnel)
      VALUES (?, ?)
    `,
      [idIntervention, formData.id_personnel]
    );

    // 3. Insérer chaque id_prestation dans la table realiser et contenir
    for (const idPrestation of formData.id_prestations) {
      // 3.1. Insérer dans la table realiser
      const resultRealiser = await query(
        `
        INSERT INTO realiser (id_prestation, id_personnel, id_intervention)
        VALUES (?, ?, ?)
      `,
        [idPrestation, formData.id_personnel, idIntervention]
      );

      // 3.2. Insérer dans la table contenir
      const resultContenir = await query(
        `
        INSERT INTO contenir (id_prestation, id_intervention)
        VALUES (?, ?)
      `,
        [idPrestation, idIntervention]
      );
    }

    console.log(
      "Intervention, attribution, realiser, and contenir added successfully"
    );

    // 4. Mettre à jour etat_intervention dans la table intervention d'origine
    await query(
      `
      UPDATE intervention
      SET etat_intervention = ?
      WHERE id_intervention = ?
    `,
      ['en cours', idIntervention]
    );

    res.status(201).json({
      message:
        "Intervention, attribution, realiser, and contenir added successfully",
      resultIntervention,
      resultAttribution,
    });
  } catch (error) {
    console.error(
      "Error adding intervention, attribution, realiser, and contenir:",
      error
    );
    res.status(500).json({ message: "Internal server error" });
  }
});


//DELETE UNE INTERVENTION
app.delete(
  "/nurscare/deleteintervention/:id_intervention",
  async (req, res) => {
    try {
      const { id_intervention } = req.params;
      if (!id_intervention) {
        return res
          .status(400)
          .json({ message: "L'ID de l'intervention est requis" });
      }

      // 1. Supprimer les entrées dans la table contenir liées à l'id_intervention
      const resultContenir = await query(
        `DELETE FROM contenir WHERE id_intervention = ?`,
        [id_intervention]
      );

      // 2. Vérifier si des entrées ont été supprimées de la table contenir
      if (resultContenir.affectedRows > 0) {
        console.log(
          `Entrées de la table de jointure supprimées pour l'id_intervention ${id_intervention}`
        );
      }

      // 3. Supprimer l'entrée dans la table attribuer liée à l'id_intervention
      const resultAttribuer = await query(
        `DELETE FROM attribuer WHERE id_intervention = ?`,
        [id_intervention]
      );

      // 4. Supprimer l'entrée dans la table intervention
      const resultIntervention = await query(
        `DELETE FROM intervention WHERE id_intervention = ?`,
        [id_intervention]
      );

      // 5. Vérifier si une intervention a été supprimée
      if (resultIntervention.affectedRows === 0) {
        return res.status(404).json({ message: "Intervention non trouvée" });
      }

      console.log(`Intervention supprimée : ID ${id_intervention}`);
      res.status(200).json({ message: "Intervention supprimée avec succès" });
    } catch (error) {
      console.error("Erreur dans /nurscare/deleteintervention:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }
);


// ROUTE POUR SUPPRIMER UNE PRESTATION
app.delete("/nurscare/deleteprestation/:idPrestation", async (req, res) => {
  try {
    const idPrestation = req.params.idPrestation;

    await query("DELETE FROM realiser WHERE id_prestation = ?", [idPrestation]);

    await query("DELETE FROM contenir WHERE id_prestation = ?", [idPrestation]);

    const resultPrestation = await query(
      "DELETE FROM prestation_de_soin WHERE id_prestation = ?",
      [idPrestation]
    );

    console.log("Prestation de soin supprimée avec succès");
    res.status(200).json({
      message: "Prestation de soin supprimée avec succès",
      resultPrestation,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la suppression de la prestation de soin :",
      error
    );
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

//ROUTE POUR RECUPERER L'ITINERAIRE VIA L'API GITHUB
app.post("/nurscare/calculate-routes", async (req, res) => {
  try {
    const { adresseInfo, startingPoint } = req.body;

    if (!adresseInfo || !startingPoint) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    const result = await computeRoutes(adresseInfo, startingPoint);

    res.json(result);
  } catch (error) {
    console.error("Error while calculating routes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


//API GITHUB ITINERAIRE
import "dotenv/config";
const googleDirectionsAPIURL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";
const APIKey =
  process.env.GOOGLE_MAP_API_KEY || "AIzaSyC6aoXl4XsKf8pHYAXD-SGcxZVO0D7R33c";
/**
 * technical function to mimick latency from network in mock mode
 * @param {number} time the miliseconds to wait
 * @returns {Promise<void>} a promise that resolves after `time`ms
 */
const delay = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));

/**
 * Function able to call Google Map API
 * @param {string[]} adresses an array of adresses (e.g. "1 rue de l'exemple, 75000 Paris"). Addresses must be in France.
 * @param {string} startingPoint a starting point for the trip (following same formalism than `adresses` param)
 * @returns {Promise<{orderedAddresses: string[], encodedPolyline: string}>} Promise of an object with the list of the adresses ordered to optimize duration of transit, and encoded polyline that cna be injected inside a google Maps widget to display track
 */
const computeRoutes = async (adresses: string[], startingPoint: string) => {
  let result;
  const tzoffset = new Date().getTimezoneOffset() * 60000; //offset in milliseconds
  const now = new Date(Date.now() - tzoffset);

  if (APIKey.length) {
    const requestBody = {
      origin: {
        address: startingPoint,
      },
      destination: {
        address: startingPoint,
      },
      intermediates: adresses.map((a) => ({ address: a })),
      regionCode: "fr",
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      departureTime: now.toISOString(),
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: true,
        avoidHighways: false,
        avoidFerries: false,
      },
      optimizeWaypointOrder: "true",
      languageCode: "fr-FR",
      units: "METRIC",
    };

    const response = await fetch(googleDirectionsAPIURL, {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": APIKey,
        "X-Goog-FieldMask":
          "routes.optimizedIntermediateWaypointIndex,routes.polyline",
      },
    });

    const gMapsResult =
      (await response.json()) as google.maps.DirectionsResult & {
        error: unknown;
      };
    if (gMapsResult.error) {
      console.log(
        "Error while retrieving result",
        JSON.stringify(gMapsResult.error)
      );
      result = null;
    } else {
      const { routes } = gMapsResult;
      result = {
        // ugly casts to get the properties that i need (dunno why the types are out of date, might be doing smth wrong)
        orderedAddresses: (
          routes[0] as unknown as {
            optimizedIntermediateWaypointIndex: number[];
          }
        ).optimizedIntermediateWaypointIndex.map((i: number) => adresses[i]),
        encodedPolyline: (
          routes[0] as unknown as { polyline: { encodedPolyline: string } }
        ).polyline.encodedPolyline,
      };
    }
  } else {
    console.log(
      "No Google Map API Key found in GOOGLE_MAP_API_KEY environement variable, using mock random mode"
    );
    result = {
      orderedAddresses: adresses.sort(() => Math.floor(Math.random() * 2) - 1),
      encodedPolyline: null, // not available on mocked data
    };
  }
  await delay(1500);
  return result;
};


// ROUTE POUR MODIFIER UNE INTERVENTION
app.put("/nurscare/updateintervention/:id_intervention", async (req, res) => {
  try {
    const { id_intervention } = req.params;
    const { text, startDate, endDate, id_patient, etat_intervention, date_facturation, date_integration } = req.body;
    const existingIntervention = await query(
      "SELECT * FROM intervention WHERE id_intervention = ?",
      [id_intervention]
    );
    if (!existingIntervention || existingIntervention.length === 0) {
      return res.status(404).json({ message: "Intervention non trouvée" });
    }
    let updateQuery = "UPDATE intervention SET";
    const updateValues = [];

    if (text) {
      updateQuery += " libelle_intervention = ?,";
      updateValues.push(text);
    }
    if (endDate) {
      updateQuery += " date_intervention_fin = ?,";
      updateValues.push(new Date(endDate));
    }
    if (id_patient) {
      updateQuery += " id_patient = ?,";
      updateValues.push(id_patient);
    }
    if (etat_intervention) {
      updateQuery += " etat_intervention = ?,";
      updateValues.push(etat_intervention);
    }
    if (date_facturation) {
      updateQuery += " date_facturation = ?,";
      updateValues.push(new Date(date_facturation));
    }
    if (date_integration) {
      updateQuery += " date_integration = ?,";
      updateValues.push(new Date(date_integration));
    }
    updateQuery = updateQuery.slice(0, -1);
    updateQuery += " WHERE id_intervention = ?";
    updateValues.push(id_intervention);
    const resultIntervention = await query(updateQuery, updateValues);
    console.log(`Intervention mise à jour avec succès : ID ${id_intervention}`);
    res.status(200).json({
      message: "Intervention mise à jour avec succès",
      resultIntervention,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'intervention:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});


//ROUTE POUR AJOUTER UNE PRESTATION SUR UNE INTERVENTION DEJA CREER
app.post("/nurscare/ajouter-prestation/:id_intervention", async (req, res) => {
  try {
    const idIntervention = req.params.id_intervention;
    const { id_prestations, id_personnel } = req.body;

    for (const idPrestation of id_prestations) {
      // Insérer dans la table realiser
      const resultRealiser = await query(
        `
        INSERT INTO realiser (id_prestation, id_personnel, id_intervention)
        VALUES (?, ?, ?)
      `,
        [idPrestation, id_personnel, idIntervention]
      );
      const resultContenir = await query(
        `
        INSERT INTO contenir (id_prestation, id_intervention)
        VALUES (?, ?)
      `,
        [idPrestation, idIntervention]
      );
    }

    res
      .status(200)
      .json({ message: "Prestations ajoutées avec succès à l'intervention." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de l'ajout des prestations." });
  }
});


//ROUTE POUR ENVOYER LA FACTURE
app.post("/nurscare/envoiefacture", async (req, res) => {
  // Créez le transporteur Nodemailer
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "ipxlart@gmail.com",
      pass: "lvdh zmmk ejee okfh",
    },
  });
  
  // Extraire les données du corps de la requête
  const { from, to, subject, text, attachments } = req.body;

  // Vérifiez si les champs requis sont présents
  if (!to || !subject || !text) {
    return res.status(400).json({ success: false, error: "Invalid request body" });
  }

  // Décodez les pièces jointes si présentes
  const decodedAttachments = attachments ? attachments.map((attachment:any) => ({
    filename: attachment.filename, // Assurez-vous que ce champ est dans votre requête
    content: Buffer.from(attachment.content, 'base64'), // Décodage de la pièce jointe
  })) : [];

  // Préparer les options d'envoi
  const mailOptions = {
    from: `"Nom Affiché" <${from}>`, // Nom affiché avec l'adresse souhaitée
    to: "mathys0@hotmail.fr",
    subject: subject,
    text: text,
    attachments: decodedAttachments || [],
};

  
  try {
    // Envoyer l'email
    await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", mailOptions.text, mailOptions.attachments);
  
    res.status(200).json({ success: true, message: "Facture envoyée avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Erreur lors de l'envoi de la facture." });
  }
});


app.listen(8080, () => console.log("server started, listening on port 8080"));
