const A=['admin'],T=['admin','enseignant'],P=['admin','enseignant','parent'],I=['admin','intendant'];
const text=(key,label,extra={})=>({key,label,type:'text',...extra});
const ref=(key,label,resource,extra={})=>({key,label,type:'select',resource,...extra});
const num=(key,label,extra={})=>({key,label,type:'number',...extra});
export const roles={admin:'Administration',enseignant:'Enseignant',parent:'Parent',intendant:'Intendant'};
export const schemas={
 years:{title:'Années scolaires',read:P,write:A,fields:[text('name','Année'),{key:'active',label:'Année active',type:'select',values:[['0','Non'],['1','Oui']]}]},
 classes:{title:'Classes',read:P,write:A,fields:[text('name','Classe'),ref('teacher_id','Enseignant','users',{optional:true,role:'enseignant'})]},
 students:{title:'Élèves',read:P,write:A,fields:[text('name','Nom complet'),ref('class_id','Classe','classes'),ref('parent_id','Parent','users',{optional:true,role:'parent'})]},
 grades:{title:'Notes',read:P,write:T,fields:[ref('student_id','Élève','students'),ref('year_id','Année','years'),{key:'term',label:'Période',type:'select',values:['Trimestre 1','Trimestre 2','Trimestre 3','Semestre 1','Semestre 2'].map(v=>[v,v])},text('subject','Matière / évaluation'),num('score','Note',{min:0,step:'any'}),num('maximum','Barème',{min:.001,step:'any',default:20}),num('coefficient','Coefficient',{min:.001,step:'any',default:1})]},
 attendance:{title:'Présences',read:P,write:T,fields:[ref('student_id','Élève','students'),ref('year_id','Année','years'),{key:'day',label:'Date',type:'date',default:()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}},{key:'status',label:'Statut',type:'select',values:['Présent','Absent','Retard'].map(v=>[v,v])}]},
 suppliers:{title:'Fournisseurs',read:I,write:I,fields:[text('name','Nom'),text('email','E-mail',{type:'email',optional:true}),text('phone','Téléphone',{optional:true})]},
 items:{title:'Inventaire',read:I,write:I,fields:[text('name','Article'),num('quantity','Quantité',{min:0,step:1,default:0})]},
 orders:{title:'Approvisionnements',read:I,write:I,fields:[ref('supplier_id','Fournisseur','suppliers'),ref('item_id','Article','items'),num('quantity','Quantité',{min:1,step:1,default:1})]},
 users:{title:'Comptes',read:A,write:A,fields:[text('name','Nom complet'),text('email','E-mail',{type:'email'}),{key:'role',label:'Rôle',type:'select',values:Object.entries(roles)},text('password','Mot de passe (12 caractères minimum)',{type:'password',secret:true})]}
};
