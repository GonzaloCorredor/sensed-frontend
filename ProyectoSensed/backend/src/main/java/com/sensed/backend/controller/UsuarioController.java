package com.sensed.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// IMPORTANTE: Asegúrate de que estas rutas coincidan con tus carpetas reales
import com.sensed.backend.model.Usuario; 
import com.sensed.backend.repository.UsuarioRepository;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"https://sensed.es", "http://localhost:5500", "http://127.0.0.1:5500"})
public class UsuarioController {

    // Inyectamos el repositorio para poder hablar con MySQL
    @Autowired
    private UsuarioRepository usuarioRepository;

    @PostMapping("/registro")
    public ResponseEntity<?> registrarUsuario(@RequestBody Map<String, String> datosUsuario) {
        
        try {
            // 1. Extraemos los datos que envía tu frontend
            String username = datosUsuario.get("username");
            String password = datosUsuario.get("password");

            // 2. Creamos un nuevo objeto Usuario y le metemos los datos
            Usuario nuevoUsuario = new Usuario();
            nuevoUsuario.setUsername(username);
            nuevoUsuario.setPassword(password); // Nota: En un entorno real, aquí encriptaríamos la contraseña
            
            // 3. ¡Lo guardamos en la base de datos!
            usuarioRepository.save(nuevoUsuario);

            // 4. Le decimos al frontend que todo ha ido genial
            return ResponseEntity.ok().body(Map.of("mensaje", "Registro exitoso en base de datos"));

        } catch (Exception e) {
            // Si falla la base de datos, mostramos el error exacto
            return ResponseEntity.internalServerError().body(Map.of("error", "Error al registrar: " + e.getMessage()));
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> iniciarSesion(@RequestBody Map<String, String> datosLogin) {
        String username = datosLogin.get("username");
        String password = datosLogin.get("password");

        // Buscamos al usuario en la base de datos
        var usuarioEncontrado = usuarioRepository.findByUsername(username);

        // Si existe y la contraseña coincide
        if (usuarioEncontrado.isPresent() && usuarioEncontrado.get().getPassword().equals(password)) {
            return ResponseEntity.ok().body(Map.of("mensaje", "Login exitoso"));
        } else {
            return ResponseEntity.status(401).body(Map.of("error", "Usuario o contraseña incorrectos"));
        }
    }
}

