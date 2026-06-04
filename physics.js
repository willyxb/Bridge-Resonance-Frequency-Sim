/**
 * Advanced Bridge Resonance Physics Engine
 * Implements RK4 (Runge-Kutta 4th order) for stable numerical integration.
 */

class BridgePhysics {
    constructor() {
        // State variables
        this.t = 0;       // Time (s)
        this.x = 0;       // Displacement (m)
        this.v = 0;       // Velocity (m/s)

        // Parameters
        this.m = 1000;    // Mass (kg)
        this.k = 40000;   // Stiffness (N/m)
        this.c = 20;      // Damping coefficient (kg/s)
        
        // Forcing
        this.F0 = 500;    // Force Amplitude (N)
        this.f_force = 1.0; // Forcing Frequency (Hz)
        
        // Settings
        this.dampingEnabled = true;
        this.windNoiseEnabled = false;
        
        // Failure System
        this.criticalAmplitude = 2.5; // meters
        this.failed = false;

        // Energy
        this.KE = 0;
        this.PE = 0;
        this.TotalE = 0;
    }

    // Reset state
    reset() {
        this.t = 0;
        this.x = 0;
        this.v = 0;
        this.failed = false;
        this.updateEnergy();
    }

    // Natural Frequency (Hz)
    getNaturalFrequency() {
        // f_n = (1 / 2π) * sqrt(k / m)
        return (1 / (2 * Math.PI)) * Math.sqrt(this.k / this.m);
    }

    // External Force at time t
    getExternalForce(time) {
        let force = this.F0 * Math.cos(2 * Math.PI * this.f_force * time);
        
        // Add random wind noise if enabled (approx 15% of F0 max)
        if (this.windNoiseEnabled) {
            let noise = (Math.random() * 2 - 1) * (this.F0 * 0.15);
            force += noise;
        }
        return force;
    }

    // Acceleration function: a = F_net / m
    // F_net = -kx - cv + F_ext
    getAcceleration(x_val, v_val, time) {
        let f_spring = -this.k * x_val;
        let f_damping = this.dampingEnabled ? -this.c * v_val : 0;
        let f_ext = this.getExternalForce(time);
        
        return (f_spring + f_damping + f_ext) / this.m;
    }

    // RK4 Integrator Step
    step(dt) {
        if (this.failed) return; // Stop physics if failed

        // k1
        let k1_x = this.v;
        let k1_v = this.getAcceleration(this.x, this.v, this.t);

        // k2
        let k2_x = this.v + 0.5 * dt * k1_v;
        let k2_v = this.getAcceleration(this.x + 0.5 * dt * k1_x, k2_x, this.t + 0.5 * dt);

        // k3
        let k3_x = this.v + 0.5 * dt * k2_v;
        let k3_v = this.getAcceleration(this.x + 0.5 * dt * k2_x, k3_x, this.t + 0.5 * dt);

        // k4
        let k4_x = this.v + dt * k3_v;
        let k4_v = this.getAcceleration(this.x + dt * k3_x, k4_x, this.t + dt);

        // Update state
        this.x += (dt / 6) * (k1_x + 2*k2_x + 2*k3_x + k4_x);
        this.v += (dt / 6) * (k1_v + 2*k2_v + 2*k3_v + k4_v);
        this.t += dt;

        // Check failure
        if (Math.abs(this.x) > this.criticalAmplitude) {
            this.failed = true;
        }

        this.updateEnergy();
    }

    // Update Energy calculations
    updateEnergy() {
        this.KE = 0.5 * this.m * this.v * this.v;
        this.PE = 0.5 * this.k * this.x * this.x;
        this.TotalE = this.KE + this.PE;
    }

    // Calculate theoretical steady-state amplitude for a given frequency
    // (Useful for drawing the theoretical resonance curve or quick sweep)
    getTheoreticalAmplitude(freq) {
        let omega = 2 * Math.PI * freq;
        let omega_n = Math.sqrt(this.k / this.m);
        let zeta = this.dampingEnabled ? this.c / (2 * Math.sqrt(this.m * this.k)) : 0;
        
        // Amplitude formula for driven damped harmonic oscillator
        let num = this.F0 / this.m;
        let term1 = (omega_n * omega_n) - (omega * omega);
        let term2 = 2 * zeta * omega_n * omega;
        let den = Math.sqrt(term1 * term1 + term2 * term2);
        
        if (den === 0) return this.criticalAmplitude * 2; // Approaching infinity
        return num / den;
    }
}
