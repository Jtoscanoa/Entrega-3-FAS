#!/usr/bin/env python3
"""Resume el log de auditoria (logger "auditoria") por jugador para la seccion 3.3 del E3.

Uso:  python scripts/resumen_auditoria.py logs.txt [--partida ID] [--csv salida.csv]
El archivo puede ser la salida de Render o de docker compose: se toma cada linea que contenga un JSON con "tipo".
Solo cuenta lo que esta en el log; no estima nada.
"""
import argparse
import csv
import json
import statistics
import sys
from collections import defaultdict
from datetime import datetime


def lineas_json(ruta):
    with open(ruta, encoding="utf-8", errors="replace") as f:
        for linea in f:
            i = linea.find('{"tipo"')
            if i < 0:
                continue
            try:
                yield json.loads(linea[i:].strip())
            except json.JSONDecodeError:
                continue


def hora(texto):
    return datetime.fromisoformat(texto.replace("Z", "+00:00"))


def resumir(ruta, partida=None):
    apodos = {}
    jug = defaultdict(lambda: {"turnos": [], "procesados": 0, "rechazados": defaultdict(int),
                               "cierres_validos": 0, "cierres_rechazados": 0})
    inicio_turno = {}  # partida -> (jugador, hora)
    for r in lineas_json(ruta):
        if r["tipo"] == "COMANDO":
            if partida and r.get("partidaId") != partida:
                continue
            apodos[r["jugador"]] = r.get("apodo") or r["jugador"][:8]
            j = jug[r["jugador"]]
            if r["resultado"] == "PROCESADO":
                j["procesados"] += 1
            else:
                j["rechazados"][r.get("motivo") or "?"] += 1
            continue
        d, ev = r.get("datos", {}), r.get("evento")
        pid = d.get("partidaId")
        if partida and pid != partida:
            continue
        t = hora(r["hora"])
        if ev == "TurnoAsignado":
            inicio_turno[pid] = (d["jugadorId"], t)
        elif ev in ("CartaDescartada", "RondaLiquidada"):
            quien = d.get("jugadorId") or d.get("cerradorId")
            previo = inicio_turno.pop(pid, None)
            if previo and previo[0] == quien:
                jug[quien]["turnos"].append((t - previo[1]).total_seconds())
            if ev == "RondaLiquidada":
                jug[quien]["cierres_validos"] += 1
        elif ev == "CierreRechazado":
            jug[d["jugadorId"]]["cierres_rechazados"] += 1
    filas = []
    for sub, j in jug.items():
        turnos = j["turnos"]
        filas.append({
            "jugador": apodos.get(sub, sub[:8]),
            "turnos_completos": len(turnos),
            "mediana_s_por_turno": round(statistics.median(turnos), 1) if turnos else "",
            "promedio_s_por_turno": round(statistics.mean(turnos), 1) if turnos else "",
            "cierres_validos": j["cierres_validos"],
            "cierres_rechazados": j["cierres_rechazados"],
            "comandos_procesados": j["procesados"],
            "comandos_rechazados": sum(j["rechazados"].values()),
            "motivos_rechazo": "; ".join(f"{k}={v}" for k, v in sorted(j["rechazados"].items())),
        })
    return filas


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("log")
    p.add_argument("--partida", type=int)
    p.add_argument("--csv")
    a = p.parse_args()
    filas = resumir(a.log, a.partida)
    if not filas:
        sys.exit("No se encontraron lineas de auditoria en el archivo.")
    if a.csv:
        with open(a.csv, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(filas[0]))
            w.writeheader()
            w.writerows(filas)
    ancho = max(len(f["jugador"]) for f in filas)
    for f in filas:
        print(f'{f["jugador"]:<{ancho}}  turnos={f["turnos_completos"]:<3} mediana={f["mediana_s_por_turno"]}s  '
              f'cierres ok={f["cierres_validos"]} rechazados={f["cierres_rechazados"]}  '
              f'comandos rechazados={f["comandos_rechazados"]} {f["motivos_rechazo"]}')


if __name__ == "__main__":
    main()
