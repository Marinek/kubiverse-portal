export function getDriverForDBMS(dbms: 'oracle' | 'mysql' | 'mariadb' | 'postgres'): string {
    switch (dbms) {
        case 'oracle':
            return 'oracle.jdbc.driver.OracleDriver';
        case 'mysql':
        case 'mariadb':
            return 'com.mysql.cj.jdbc.Driver';
        case 'postgres':
            return 'org.postgresql.Driver';
        default:
            throw new Error(`Unsupported DBMS type: ${dbms}`);
    }
}

export function getUrlForDBMS(dbms: 'oracle' | 'mysql' | 'mariadb' | 'postgres', projectName: string): string {
    // Generate dynamic host and db name based on the project namespace
    const host = `${projectName}-${dbms}-db`;
    const dbName = projectName.replace(/-/g, '_');
    
    switch (dbms) {
        case 'oracle':
            return `jdbc:oracle:thin:@${host}:1521:${dbName}`;
        case 'mysql':
            return `jdbc:mysql://${host}:3306/${dbName}`;
        case 'mariadb':
            return `jdbc:mariadb://${host}:3306/${dbName}`;
        case 'postgres':
            return `jdbc:postgresql://${host}:5432/${dbName}`;
        default:
            throw new Error(`Unsupported DBMS type: ${dbms}`);
    }
}
