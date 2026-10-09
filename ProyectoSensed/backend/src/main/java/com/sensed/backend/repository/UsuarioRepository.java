package com.sensed.backend.repository;

import com.sensed.backend.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    
    // Con solo escribir el nombre de este método, Spring ya sabe generar la consulta SQL:
    // SELECT * FROM usuarios WHERE username = ?
    Optional<Usuario> findByUsername(String username);
}