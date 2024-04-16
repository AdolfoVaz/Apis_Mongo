const express = require ("express");
const mongoose = require ("mongoose");
const jwt = require("jsonwebtoken"); 

require("dotenv").config();

const cors = require("cors");

const app = express();


app.use(express.json());

app.use(cors());

mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "error de conexion a mongodb"));
db.once("open", () => {
    console.log("Conectado a mongodb");
});


//define el esquema del modelo

const AlumnosSchema = new mongoose.Schema({
    
nombre: String,
edad:{ 
  type:Number,
  required:true,
  intger:true
},
genero:String,
grado:String,
idUser: {
  type: String,
  ref: "User",
  required: [true, "Property is required"],
},
});



const UsersSchema = new mongoose.Schema({
 
user: String,
password: String,
rol: String
});

const MateriaSchema = new mongoose.Schema({

  nombre: String

});


let califSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Alumno",
    required: [true, "Property is required"],
  },
  materiaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Materia",
    required: [true, "Property is required"],
  },
  calificacion: {
    type: Number,
    required: [true, "Property is required"],
  },
});

//define el modelo
const Alumno = mongoose.model("alumno",AlumnosSchema);

const User = mongoose.model("user", UsersSchema);

const Materia = mongoose.model("materia", MateriaSchema);

const Calificacion = mongoose.model("Calificaciones", califSchema);

//ruta para login
app.post("/login", async (req, res) => {
  try {
    const { user, password } = req.body;

    // Busca en la base de datos el usuario con las credenciales proporcionadas
    const userFound = await User.findOne({ user });

    if (userFound) {
      // Compara la contraseña proporcionada con la almacenada en la base de datos
      const match = password === userFound.password;

      if (match) {
        // Si la contraseña es correcta y el usuario es un alumno, recupera información adicional
        const token = jwt.sign({ userId: userFound._id }, process.env.JWT_SECRET);
        if (userFound.rol !== "Maestro") {

          const userInfo = await Alumno.findOne({idUser: userFound._id.toString() });
          res.json({
            idUser: userFound._id,
            idAlumno: userInfo._id,
            token: token,
            email: userFound.user, 
            nombre: userInfo.nombre,
            rol: userFound.rol,
            grado: userInfo.grado, 
            stutus: "OK"
           });
        } else {
          // Si el usuario es un maestro, devuelve solo los datos básicos del usuario
          res.json({
            idUser: userFound._id,
            email: userFound.user,
            rol: userFound.rol,
            token: token,
            status: "OK"
          });
        }
      } else {
        // Si la contraseña es incorrecta, devuelve un mensaje de error
        res.status(401).json({ error: "Credenciales inválidas" });
      }
    } else {
      // Si el usuario no existe, devuelve un mensaje de error
      res.status(401).json({ error: "Credenciales inválidas" });
    }
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

//register maestro
app.post("/register", async (req, res) => {
  try {
    const { user, password } = req.body;

    // Busca en la base de datos si ya existe un usuario con el mismo nombre de usuario
    const existingUser = await User.findOne({ user });

    if (existingUser) {
      // Si el usuario ya existe, devuelve un mensaje de error
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    // Crea un nuevo usuario con los datos proporcionados en el cuerpo de la solicitud
    const nuevoUser = new User({ user, password, rol: "Maestro" });

    // Guarda el nuevo usuario en la base de datos
    await nuevoUser.save();

    // Genera un token para el nuevo usuario
    const token = jwt.sign({ userId: nuevoUser._id }, process.env.JWT_SECRET);

    // Devuelve una respuesta JSON con los datos del nuevo usuario y el token
    res.status(201).json({
      idUser: nuevoUser._id,
      email: nuevoUser.user,
      rol: nuevoUser.rol,
      token: token,
      status: "OK"
    });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});



app.get("/alumnos", async (req, res) => {
  try {
      const alumnos = await Alumno.find();

      // Map sobre cada alumno para obtener sus datos junto con los datos del usuario correspondiente
      let alumnosConUsuario = await Promise.all(
          alumnos.map(async (alumno) => {
              // Buscar el usuario correspondiente utilizando el idUser
              const usuario = await User.findById(alumno.idUser);
              // Retornar un objeto con los datos del alumno y los datos del usuario
              return {
                  _id: alumno._id,
                  nombre: alumno.nombre,
                  edad: alumno.edad,
                  genero: alumno.genero,
                  grado: alumno.grado,
                  _id_User: usuario._id,
                      user: usuario.user,
                      rol: usuario.rol,
                      password: usuario.password
                     
              };
          })
      );

      res.json(alumnosConUsuario);
  } catch (error) {
      console.error("Error al obtener alumnos:", error);
      res.status(500).json({ error: "Error interno del servidor" });
  }
});


app.post('/agregar/user', async (req, res) => {
  try {
    const nuevoUser = new User(req.body);
    await nuevoUser.save();
    res.status(201).json(nuevoUser);
  } catch (error) {

    console.error('Error al crear un nuevo User:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/agregar/alumno', async (req, res) => {
  try {
    const nuevoAlumno = new Alumno(req.body);
    await nuevoAlumno.save();
    res.status(201).json(nuevoAlumno);
  } catch (error) {
    
    console.error('Error al crear un nuevo Alumno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


app.delete('/alumno/eliminar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Alumno.findByIdAndDelete(id);
    res.json({ message: 'Alumno eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar alumno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/alumno/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const alumnoActualizado = await Alumno.findByIdAndUpdate(id, req.body, { new: true });
    res.json(alumnoActualizado);
  } catch (error) {
    console.error('Error al actualizar alumno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userActualizado = await User.findByIdAndUpdate(id, req.body, { new: true });
    res.json(userActualizado);
  } catch (error) {
    console.error('Error al actualizar user:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get("/materias", async (req, res) => {
  try {
      const materias = await Materia.find();
      res.json(materias);
  }catch(error){
      console.error("Error al obtener alumnos:", error);
      res.status(500).json({ error: "error interno del servidor"});
  }
});


//ruta de get de alumnos

//ruta de post alumnos
app.post('/agregar/alumnos', async (req, res) => {
    try {
      const nuevoAlumno = new Alumnos(req.body);
      await nuevoAlumno.save();
      res.status(201).json(nuevoAlumno);
    } catch (error) {
      console.error('Error al crear un nuevo alumno:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
  // Ruta PUT para actualizar un alumno
app.put('/alumno/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userActualizado = await Alumnos.findByIdAndUpdate(id, req.body, { new: true });
      res.json(alumnoActualizado);
    } catch (error) {
      console.error('Error al actualizar alumno:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
  
  // Ruta DELETE para eliminar un alumno
  app.delete('/alumno/eliminar/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await Alumnos.findByIdAndDelete(id);
      res.json({ message: 'Alumno eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar alumno:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.get('/alumno/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const alumnos = await Alumnos.findById(id);
        
        // Verifica si el id es un ObjectId válido antes de realizar la búsqueda
      
        res.json(alumnos);
    } catch (error) {
        console.error('Error al obtener alumno:', error);
        res.status(500).json({ error: 'Error interno del servidor' , error});
    }
});

//calificaciones

// get para todos las califaciones
app.get("/calificaciones", async (req, res) => {
  try {
    const calificaciones = await Calificacion.find();
    // const usuarios = await Usuario.findById(req.params.userId);

    let nuevasCalif = await Promise.all(
      calificaciones.map(async (element) => {
        const userInfo = await Alumno.findById(element.userId);
        const matInfo = await Materia.findById(element.materiaId);
        return {
          _id:element. _id ?? '',
          alumno: userInfo.nombre ?? '',
          alumnoid: userInfo._id ?? '',
          materia:matInfo. nombre ?? '',
          materiaid: matInfo._id ?? '',
          calificacion: element.calificacion ?? '',
          status: "OK"
          
        };
      })
    );

    res.json(nuevasCalif);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


app.post('/agregar/calificacion', async (req, res) => {
  try {
    const calificaciones = req.body;
    // Suponiendo que calificaciones es un arreglo de objetos con la estructura que mencionaste en tu esquema de la base de datos
    // Iterar sobre cada calificación y guardarla en la base de datos
    await Promise.all(calificaciones.map(async (calificacion) => {
        const nuevaCalificacion = new Calificacion(calificacion);
        await nuevaCalificacion.save();
    }));
    res.status(201).json({ message: 'Calificaciones agregadas exitosamente' });
  } catch (error) {
    console.error('Error al agregar calificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/calificacion/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const calActualizado = await Calificacion.findByIdAndUpdate(id, req.body, { new: true });
    res.json(calActualizado);
  } catch (error) {
    console.error('Error al actualizar alumno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get("/miscalificaciones/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Busca las calificaciones que corresponden al ID del alumno proporcionado
    const calificaciones = await Calificacion.find({ userId: id });

    // Verifica si se encontraron calificaciones para el alumno especificado
    if (calificaciones.length === 0) {
      return res.status(404).json({ error: "No se encontraron calificaciones para el alumno especificado" });
    }

    // Mapea las calificaciones encontradas y realiza la transformación necesaria
    let nuevasCalificaciones = await Promise.all(
      calificaciones.map(async (element) => {
        const userInfo = await Alumno.findById(element.userId);
        const matInfo = await Materia.findById(element.materiaId);
        return {
          _id: element._id ?? '' ,
          alumno: userInfo.nombre ?? '',
          alumnoid: userInfo._id ?? '',
          materia: matInfo.nombre ?? '',
          materiaid: matInfo._id ?? '',
          calificacion: element.calificacion ?? '',
          status: "OK"
        };
      })
    );

    // Devuelve las calificaciones transformadas como respuesta JSON
    res.json(nuevasCalificaciones);
  } catch (error) {
    console.error("Error al obtener calificaciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});







  

//iniciar el server
const port = 3000;
app.listen(port,
    () => {
        console.log("server on en http://localhost:3000");;

    });
//conec






