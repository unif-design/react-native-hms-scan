"""Run production Kotlin against narrow Android/RN/vendor boundary doubles.

Requires the example Android build's cached Kotlin compiler and JDK 17+.
These tests do not measure a camera, Android image codec, or device heap.
"""

import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from native.coverage_tools import jacoco_tools
from native.check_library_coverage import main as check_coverage

root = Path(__file__).resolve().parent.parent
cache = (
    Path(os.environ.get("GRADLE_USER_HOME", str(Path.home() / ".gradle")))
    / "caches/modules-2/files-2.1"
)


def cached(pattern):
    matches = sorted(cache.glob(pattern))
    if not matches:
        raise SystemExit(
            "Missing cached Kotlin compiler dependency: " + pattern
            + "; run bash .github/ci/android.sh first"
        )
    return str(matches[-1])


def dependencies(module):
    """Use the compiler's own POM instead of picking unrelated cached versions."""
    pom = ET.parse(cached(module + "/*/*.pom"))
    namespace = {"m": "http://maven.apache.org/POM/4.0.0"}
    return [
        "/".join(dependency.findtext("m:" + field, namespaces=namespace)
                 for field in ("groupId", "artifactId", "version"))
        for dependency in pom.findall("m:dependencies/m:dependency", namespace)
    ]


build = (root / "example/android/build.gradle").read_text()
configured = re.search(r'kotlinVersion\s*=\s*"([^"]+)"', build)
if not configured:
    raise SystemExit("Cannot locate the example's configured Kotlin version")
version = configured.group(1)
compiler = "org.jetbrains.kotlin/kotlin-compiler-embeddable/" + version
stdlib = "org.jetbrains.kotlin/kotlin-stdlib/" + version
modules = [compiler, *dependencies(compiler), *dependencies(stdlib)]
classpath = [cached(module + "/*/*.jar") for module in dict.fromkeys(modules)]
stdlib_jar = cached(stdlib + "/*/*.jar")
annotations = [cached(module + "/*/*.jar") for module in dependencies(stdlib)]
java = (
    str(Path(os.environ["JAVA_HOME"]) / "bin/java")
    if "JAVA_HOME" in os.environ else shutil.which("java")
)
if not java:
    raise SystemExit("JDK 17+ is required; set JAVA_HOME")
production = root / "android/src/main/java/com/unif/reactnativehmsscan"
sources = sorted(production.glob("*.kt"))
sources += sorted((root / "scripts/native-tests/android").glob("*.kt"))
coverage = root / "coverage/native/android"
coverage.mkdir(parents=True, exist_ok=True)
agent, cli = jacoco_tools(root)
with tempfile.TemporaryDirectory(prefix="hms-scan-native-") as target:
    command = [
        java, "-cp", os.pathsep.join(classpath),
        "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler",
        "-nowarn", "-no-stdlib", "-no-reflect",
        "-classpath", os.pathsep.join([stdlib_jar, *annotations]),
        "-d", target, *map(str, sources),
    ]
    subprocess.run(command, check=True)
    result = subprocess.run([
        java, "-javaagent:" + str(agent) + "=destfile=" + str(coverage / "jacoco.exec") + ",append=false",
        "-cp", target + os.pathsep + stdlib_jar, "HarnessKt",
    ])
    report_classes = Path(target) / "report-classes"
    report_classes.mkdir()
    class_root = Path(target) / "com/unif/reactnativehmsscan"
    for source in production.glob("*.kt"):
        for compiled in class_root.glob(source.stem + "*.class"):
            shutil.copy2(compiled, report_classes / compiled.name)
    subprocess.run([
        java, "-jar", str(cli), "report", str(coverage / "jacoco.exec"),
        "--classfiles", str(report_classes), "--sourcefiles", str(production),
        "--xml", str(coverage / "coverage.xml"), "--html", str(coverage / "html"),
    ], check=True)
    if result.returncode:
        raise SystemExit(result.returncode)
    check_coverage("android")
